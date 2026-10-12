/* One-time approved production operation. No runtime route invokes this file.
 * A complete private backup and scratch restore MUST succeed before migration.
 * Credentials, database rows and raw child-process errors are never logged.
 */
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')
const { put, get } = require('@vercel/blob')
const MIGRATION = '20261006120000_admin_permissions'
const INITIAL = '20261004000000_initial_postgresql'
const EXPECTED_TABLES = ['AuthSession','ContentDraft','HomepageItem','MediaAsset','Role']
const schema = 'prisma/schema.prisma'
let stage = 'authorization', temporaryDirectory, pgEnvironment, recoveryEnvironment
function fail(reason) { throw new Error(reason) }
function report(value) { console.log('PYPC_APPROVED_MIGRATION ' + JSON.stringify({ stage, ...value })) }
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 16*1024*1024, ...options })
  if (result.status !== 0) fail('command_failed_' + path.basename(command).replace(/[^a-zA-Z0-9_-]/g,''))
  return result.stdout || ''
}
function prisma(args, options = {}) { return run(process.execPath,[require.resolve('prisma/build/index.js'),...args],options) }
function quoteIdentifier(value) { return '"' + value.replaceAll('"','""') + '"' }
function hashFile(filename) { return createHash('sha256').update(fs.readFileSync(filename)).digest('hex') }
function restoreDiagnostic(stderr) {
  if (/schema "public" already exists/.test(stderr)) return { cause:'public_schema_already_exists' }
  const extension = stderr.match(/extension "([a-z0-9_-]+)" is not available/i)?.[1]
  if (extension && ['pg_stat_statements','pgcrypto','uuid-ossp','pg_trgm','citext','btree_gin','btree_gist','hstore'].includes(extension)) return { cause:'standard_extension_unavailable',extension }
  if (/unrecognized configuration parameter/.test(stderr)) return { cause:'unsupported_postgresql_setting' }
  if (/unsupported version.*file header/i.test(stderr)) return { cause:'archive_tool_version_mismatch' }
  if (/role .* does not exist/.test(stderr)) return { cause:'restore_role_missing' }
  if (/Permission denied|permission denied/.test(stderr)) return { cause:'scratch_permission_denied' }
  if (/could not connect|connection.*failed|connection refused/i.test(stderr)) return { cause:'scratch_connection_failed' }
  if (extension) return { cause:'provider_extension_unavailable',extension }
  if (/collation|locale/i.test(stderr)) return { cause:'scratch_locale_mismatch' }
  return { cause:'restore_failed_details_withheld' }
}
function postgresEnvironment(url) {
  const parsed = new URL(url)
  if (!['postgres:','postgresql:'].includes(parsed.protocol)) fail('direct_postgresql_connection_required')
  // Provider-documented pooled/direct host pair, using the same existing credential.
  if (parsed.hostname === 'pooled.db.prisma.io') parsed.hostname = 'db.prisma.io'
  if (parsed.hostname !== 'db.prisma.io') fail('unexpected_database_provider')
  return { ...process.env, PGHOST:parsed.hostname, PGPORT:parsed.port || '5432', PGUSER:decodeURIComponent(parsed.username), PGPASSWORD:decodeURIComponent(parsed.password), PGDATABASE:decodeURIComponent(parsed.pathname.slice(1)) || 'postgres', PGSSLMODE:'require', PGCONNECT_TIMEOUT:'20', PGAPPNAME:'pypc-approved-admin-migration' }
}
function productionSql(query) {
  return run('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',query],{env:pgEnvironment}).trim()
}
function recoverySql(query) {
  if (!recoveryEnvironment || recoveryEnvironment.PGUSER === pgEnvironment.PGUSER) fail('recovery_must_be_separate_from_production')
  return run('psql',['-X','-A','-t','-v','ON_ERROR_STOP=1','-c',query],{env:recoveryEnvironment}).trim()
}
async function main() {
  if (process.env.VERCEL_ENV !== 'production' || process.env.PYPC_APPROVED_ADMIN_MIGRATION !== MIGRATION || process.platform !== 'linux') fail('explicit_production_approval_required')
  if (process.env.VERCEL_PROJECT_ID && process.env.VERCEL_PROJECT_ID !== 'prj_mWdkLjfegGVGZEGxPp3HHq69sMP9') fail('unexpected_project')
  if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.DATABASE_URL) fail('existing_database_and_private_storage_required')
  const migrationFolders = fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort()
  if (JSON.stringify(migrationFolders) !== JSON.stringify([INITIAL,MIGRATION])) fail('unexpected_migration_files')
  const migrationFile = 'prisma/migrations/' + MIGRATION + '/migration.sql'
  const migrationSql = fs.readFileSync(migrationFile,'utf8').replaceAll('\r\n','\n')
  const migrationHash = createHash('sha256').update(migrationSql).digest('hex')
  if (migrationHash !== process.env.PYPC_APPROVED_MIGRATION_SHA256) fail('approved_migration_checksum_mismatch')
  if (/^\s*(?:DROP|DELETE|TRUNCATE|UPDATE|INSERT)\b/im.test(migrationSql.replace(/--[^\n]*/g,''))) fail('migration_outside_additive_scope')
  pgEnvironment = postgresEnvironment(process.env.DATABASE_URL)
  if (!process.env.PYPC_RECOVERY_DATABASE_URL) fail('approved_private_recovery_connection_required')
  recoveryEnvironment = postgresEnvironment(process.env.PYPC_RECOVERY_DATABASE_URL)
  if (recoveryEnvironment.PGUSER === pgEnvironment.PGUSER) fail('recovery_must_be_separate_from_production')
  stage = 'read_only_schema_comparison'
  const diff = spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate','diff','--from-schema-datasource',schema,'--to-schema-datamodel',schema,'--script','--exit-code'],{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024})
  if (diff.status === 0) { report({ alreadyCompatible:true, databaseModified:false }); return }
  if (diff.status !== 2) fail('read_only_schema_comparison_failed')
  const needed = [...diff.stdout.matchAll(/CREATE TABLE (?:"[^"\r\n]+"\.)?"([A-Za-z0-9_]+)"/g)].map(match=>match[1]).sort()
  if (JSON.stringify(needed) !== JSON.stringify(EXPECTED_TABLES) || /\bDROP\b/i.test(diff.stdout)) fail('database_drift_outside_approved_migration')
  const allowedAlter = [...diff.stdout.matchAll(/ALTER TABLE (?:"[^"\r\n]+"\.)?"([A-Za-z0-9_]+)"/g)].every(match=>['User','AuthSession'].includes(match[1]))
  if (!allowedAlter) fail('unexpected_existing_table_change')
  stage = 'postgresql_backup_tools'
  const existingTools = spawnSync('pg_dump',['--version'],{encoding:'utf8'})
  if (existingTools.status !== 0 || !/\b(?:17|18)\./.test(existingTools.stdout)) {
    // Packages are installed only into this disposable Vercel build machine.
    run('dnf',['install','-y','postgresql17'],{timeout:240000})
  }
  const versions = {}
  for (const tool of ['pg_dump','pg_restore','psql']) versions[tool] = run(tool,['--version']).match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0] || 'unknown'
  report({versions})
  stage = 'migration_history_read'
  if (productionSql("SELECT to_regclass('public._prisma_migrations') IS NOT NULL") !== 't') fail('existing_migration_tracking_missing')
  const history = JSON.parse(productionSql(`SELECT COALESCE(json_agg(json_build_object('name',migration_name,'finished',finished_at IS NOT NULL,'rolledBack',rolled_back_at IS NOT NULL)), '[]'::json) FROM "_prisma_migrations"`))
  if (!history.some(item=>item.name===INITIAL && item.finished && !item.rolledBack) || history.some(item=>!item.finished && !item.rolledBack) || history.some(item=>![INITIAL,MIGRATION].includes(item.name))) fail('unexpected_migration_tracking_state')
  if (history.some(item=>item.name===MIGRATION && item.finished && !item.rolledBack)) fail('migration_marked_applied_but_schema_differs')
  stage = 'recovery_target_isolation'
  if (recoverySql("SELECT count(*) FROM pg_tables WHERE schemaname='public'") !== '0') fail('recovery_target_is_not_empty')
  if (recoverySql("SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname='prisma_postgres')") !== 't') fail('recovery_provider_extension_missing')
  report({recoveryResourceId:'store_9ZZJ0dY88a8lBFea',separateConnection:true,emptyApplicationSchema:true,providerExtensionPresent:true,plan:'free'})
  temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(),'pypc-approved-backup-'))
  const archive = path.join(temporaryDirectory,'database.dump')
  const recoveredArchive = path.join(temporaryDirectory,'verified.dump')
  stage = 'read_only_backup'
  run('pg_dump',['--format=custom','--no-owner','--no-privileges','--file',archive],{env:pgEnvironment,timeout:240000})
  const catalog = run('pg_restore',['--list',archive])
  const extensions = [...catalog.matchAll(/ EXTENSION - ([a-z0-9_-]+)\b/g)].map(match=>match[1])
  report({archiveExtensions:[...new Set(extensions)]})
  if (!catalog.includes('TABLE DATA public User') || !catalog.includes('TABLE DATA public _prisma_migrations')) fail('backup_missing_required_tables')
  const sha256 = hashFile(archive), bytes = fs.statSync(archive).size
  if (bytes < 1024) fail('backup_archive_unexpectedly_small')
  const backupPrefix = 'database-backups/pre-admin-' + new Date().toISOString().replace(/[:.]/g,'-')
  stage = 'private_backup_storage'
  const blob = await put(backupPrefix+'/database.dump',fs.createReadStream(archive),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/octet-stream'})
  const anonymous = await fetch(blob.url,{redirect:'manual',signal:AbortSignal.timeout(20000)})
  await anonymous.body?.cancel()
  if (![401,403,404].includes(anonymous.status)) fail('backup_is_not_private')
  const downloaded = await get(blob.url,{access:'private',useCache:false})
  if (downloaded?.statusCode !== 200) fail('stored_backup_download_failed')
  await pipeline(Readable.fromWeb(downloaded.stream),fs.createWriteStream(recoveredArchive,{mode:0o600}))
  if (hashFile(recoveredArchive)!==sha256) fail('stored_backup_checksum_mismatch')
  report({backupPath:blob.pathname,sha256,bytes,privateAccessVerified:true,downloadChecksumVerified:true})
  stage = 'isolated_restore_verification'
  // The supported Prisma recovery database was provisioned on the existing
  // free plan, with a namespaced credential scoped to that separate resource.
  // No DROP/CLEAN flags are used; failures roll back this entire restore.
  const restoreArgs = ['--single-transaction','--exit-on-error','--no-owner','--no-privileges','--dbname',recoveryEnvironment.PGDATABASE,recoveredArchive]
  const restore = spawnSync('pg_restore',restoreArgs,{env:recoveryEnvironment,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024})
  if (restore.status !== 0) {
    report({restoreDiagnostic:restoreDiagnostic(restore.stderr || '')})
    fail('isolated_restore_verification_failed')
  }
  const tables = JSON.parse(recoverySql("SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'"))
  if (!tables.includes('User') || !tables.includes('_prisma_migrations') || tables.length < 23) fail('isolated_restore_table_verification_failed')
  const counts = {}
  for (const table of tables) counts[table] = Number(recoverySql('SELECT count(*) FROM public.'+quoteIdentifier(table)))
  const manifest = { format:'PostgreSQL custom archive',migration:MIGRATION,migrationSha256:migrationHash,createdAt:new Date().toISOString(),archivePath:blob.pathname,sha256,bytes,tableCounts:counts,privateAccessVerified:true,downloadChecksumVerified:true,fullRestoreVerified:true,recoveryResourceId:'store_9ZZJ0dY88a8lBFea',recovery:'Use a separate, empty Prisma Postgres database with its prisma_postgres extension. Download with authenticated Vercel Blob access, verify SHA256, then pg_restore --single-transaction --exit-on-error --no-owner --no-privileges --dbname=<recovery database> database.dump using private connection environment variables. Switching production requires an approved recovery operation. The temporary recovery database is retained pending explicit deletion confirmation.' }
  await put(backupPrefix+'/manifest.json',JSON.stringify(manifest,null,2),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'})
  stage = 'backup_verified'
  report({ backupPath:blob.pathname,sha256,bytes,restoredTables:tables.length,privateAccessVerified:true,downloadChecksumVerified:true,fullRestoreVerified:true,recoveryResourceId:'store_9ZZJ0dY88a8lBFea',productionDatabaseModified:false })
  stage = 'approved_additive_migration'
  // The checked-in migration is the sole unapplied migration, verified above.
  prisma(['migrate','deploy','--schema',schema],{timeout:180000})
  const applied = Number(productionSql(`SELECT count(*) FROM "_prisma_migrations" WHERE migration_name='${MIGRATION}' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`))
  if (applied !== 1) fail('migration_tracking_postcheck_failed')
  const final = require('./check-production-schema.cjs')({log:message=>console.log(message)})
  if (final !== 0) fail('post_migration_schema_check_failed')
  for (const table of tables) if (Number(productionSql('SELECT count(*) FROM public.'+quoteIdentifier(table))) < counts[table]) fail('existing_row_count_decreased')
  stage = 'migration_verified'
  report({ migration:MIGRATION,tracked:true,schemaCompatible:true,existingRowCountsPreserved:true,backupPath:blob.pathname,databaseModified:true })
}
async function cleanup() {
  if (temporaryDirectory && path.resolve(temporaryDirectory).startsWith(path.resolve(os.tmpdir())+path.sep+'pypc-approved-backup-')) fs.rmSync(temporaryDirectory,{recursive:true,force:true})
}
if (require.main === module) main().catch(error=>{report({status:'stopped',reason:/^[a-z0-9_]+$/.test(error.message)?error.message:'operation_failed_details_withheld',migrationNotAttempted:!['approved_additive_migration','migration_verified'].includes(stage)});process.exitCode=1}).finally(cleanup)
module.exports = { postgresEnvironment,quoteIdentifier,restoreDiagnostic }
