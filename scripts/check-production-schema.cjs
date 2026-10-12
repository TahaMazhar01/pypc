const { spawnSync } = require('node:child_process')

// Runs inside the deployment build. The database URL never enters argv or logs.
// `migrate diff` only reads schema metadata; no migration is executed here.
function checkProductionSchema({ env = process.env, run = spawnSync, log = console.log } = {}) {
  if (!/^(postgres(?:ql)?:\/\/|prisma(?:\+postgres)?:\/\/)/.test(env.DATABASE_URL || '')) {
    log('PYPC_SCHEMA_CHECK ' + JSON.stringify({ compatible: false, reason: 'hosted_database_url_required', databaseModified: false }))
    return 1
  }
  const result = run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--script', '--exit-code'], { env, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
  if (result.status === 0) {
    log('PYPC_SCHEMA_CHECK ' + JSON.stringify({ compatible: true, databaseModified: false }))
    return 0
  }
  if (result.status === 2) {
    const sql = result.stdout || ''
    const newTables = [...sql.matchAll(/CREATE TABLE (?:"[^"\r\n]+"\.)?"([A-Za-z0-9_]+)"/g)].map(match => match[1])
    const alteredTables = [...new Set([...sql.matchAll(/ALTER TABLE (?:"[^"\r\n]+"\.)?"([A-Za-z0-9_]+)"/g)].map(match => match[1]))]
    log('PYPC_SCHEMA_CHECK ' + JSON.stringify({ compatible: false, reason: 'schema_migration_requires_separate_approval', newTables, alteredTables, destructiveStatements: (sql.match(/\bDROP (?:TABLE|COLUMN)\b/g) || []).length, databaseModified: false }))
    return 1
  }
  const code = (result.stderr || '').match(/\bP\d{4}\b/)?.[0]
  log('PYPC_SCHEMA_CHECK ' + JSON.stringify({ compatible: false, reason: 'read_only_schema_check_failed', ...(code ? { prismaCode: code } : {}), databaseModified: false }))
  return 1
}
module.exports = checkProductionSchema
if (require.main === module) process.exitCode = checkProductionSchema()
