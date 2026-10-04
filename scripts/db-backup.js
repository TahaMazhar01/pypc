#!/usr/bin/env node
/**
 * Database backup.
 *
 *   npm run db:backup                      # timestamped backup into ./backups/
 *   npm run db:backup -- --label pre-launch
 *
 * What it produces, per run:
 *
 *   backups/<timestamp>[-label]/
 *     database.sqlite      byte-exact copy of the live SQLite file, taken while
 *                          the site is serving from it
 *     database.json        portable export of every table, read through Prisma —
 *                          restorable on any engine, diffable in review, and the
 *                          one artefact that survives a move to PostgreSQL
 *     manifest.json        what was taken, when, from where, and the row counts
 *     SHA256SUMS           checksums, so a restore can prove the files are intact
 *
 * No external tools are required: the export goes through the Prisma client the
 * application already uses, so this runs anywhere `npm start` runs. Nothing is
 * destructive — the script only reads the database and writes into ./backups/,
 * which is excluded from the shipped package and from version control.
 */
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const ROOT = path.resolve(__dirname, '..')
process.chdir(ROOT)

const { PrismaClient } = require('@prisma/client')
require('@next/env').loadEnvConfig(ROOT)
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('file:')) {
  console.error('This command is SQLite-only. For PostgreSQL use pg_dump / pg_restore; see docs/POSTGRESQL.md.');
  process.exit(1)
}


/**
 * Reads DATABASE_URL the way the application does: from the environment, falling
 * back to the project's .env. A relative `file:` path is resolved against the
 * Prisma schema directory, which is Prisma's own rule — so this points at exactly
 * the database the running site is using.
 */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const envPath = path.join(ROOT, '.env')
  if (fs.existsSync(envPath)) {
    const match = fs.readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*["']?([^"'\n]+)["']?/m)
    if (match) return match[1].trim()
  }
  return 'file:./dev.db'
}

function databasePath() {
  const raw = databaseUrl().replace(/^file:/, '')
  // Relative paths are relative to prisma/, exactly as Prisma resolves them.
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT, 'prisma', raw)
}

function label() {
  const index = process.argv.indexOf('--label')
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1].replace(/[^a-z0-9-]/gi, '')
  return ''
}

function stamp() {
  const now = new Date()
  const pad = value => String(value).padStart(2, '0')
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  )
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

async function main() {
  const prisma = new PrismaClient()
  const file = databasePath()

  if (!fs.existsSync(file)) {
    console.error(`No database found at ${file}`)
    console.error('Run `npm run db:push && npm run db:seed` first, or set DATABASE_URL.')
    process.exit(1)
  }

  const suffix = label()
  const dir = path.join(ROOT, 'backups', `${stamp()}${suffix ? '-' + suffix : ''}`)
  fs.mkdirSync(dir, { recursive: true })

  console.log(`\nBacking up ${path.relative(ROOT, file)} → ${path.relative(ROOT, dir)}\n`)

  // Every table, discovered from the database itself so a new model is never
  // silently left out of the backup.
  const tableRows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma%' ORDER BY name"
  )
  const tables = tableRows.map(row => row.name)

  const data = {}
  const counts = {}
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`)
    // BigInt is not JSON-serialisable; SQLite integers arrive as BigInt.
    data[table] = JSON.parse(
      JSON.stringify(rows, (_, value) => (typeof value === 'bigint' ? Number(value) : value))
    )
    counts[table] = data[table].length
  }

  // 1. Exact copy (taken while the site is running; SQLite files are safe to copy)
  const copy = path.join(dir, 'database.sqlite')
  fs.copyFileSync(file, copy)
  console.log(`  database.sqlite  ${(fs.statSync(copy).size / 1024).toFixed(1)} kB`)

  // 2. Portable export
  fs.writeFileSync(
    path.join(dir, 'database.json'),
    JSON.stringify({ exportedAt: new Date().toISOString(), engine: 'sqlite', tables: data }, null, 2)
  )
  const totalRows = Object.values(counts).reduce((sum, value) => sum + value, 0)
  console.log(`  database.json    ${tables.length} tables, ${totalRows} rows`)

  // 3. Manifest
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        label: suffix || null,
        databaseUrl: databaseUrl(),
        databaseFile: path.relative(ROOT, file),
        files: ['database.sqlite', 'database.json'],
        rowCounts: counts,
        restoreCommand: 'npm run db:restore-test -- backups/<this folder>/database.sqlite',
        note: 'A backup is not considered valid until a restore test passes. See docs/BACKUP-POLICY.md.'
      },
      null,
      2
    )
  )

  // 4. Checksums
  fs.writeFileSync(
    path.join(dir, 'SHA256SUMS'),
    ['database.sqlite', 'database.json', 'manifest.json']
      .map(name => `${sha256(path.join(dir, name))}  ${name}`)
      .join('\n') + '\n'
  )
  console.log('  manifest.json + SHA256SUMS written\n')

  console.log('Row counts:')
  for (const table of tables) {
    if (counts[table] > 0) console.log(`  ${table.padEnd(24)} ${counts[table]}`)
  }
  const empty = tables.filter(table => counts[table] === 0)
  if (empty.length) console.log(`  (${empty.length} table(s) empty: ${empty.join(', ')})`)

  await prisma.$disconnect()

  console.log(`\nBackup complete: ${path.relative(ROOT, dir)}`)
  console.log(`Verify it with:  npm run db:restore-test -- ${path.relative(ROOT, path.join(dir, 'database.sqlite'))}\n`)
}

main().catch(error => {
  console.error('\nBackup failed:', error.message)
  process.exit(1)
})
