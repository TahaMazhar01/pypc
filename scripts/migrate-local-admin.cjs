/* Local SQLite only: verified backup, scratch migration, then existing database. */
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { spawnSync } = require('node:child_process')
const { DatabaseSync } = require('node:sqlite')
require('@next/env').loadEnvConfig(process.cwd())
const url = process.env.DATABASE_URL || ''
if (!url.startsWith('file:') || process.env.VERCEL) throw new Error('Local SQLite only.')
const raw = url.slice(5)
const source = path.isAbsolute(raw) ? raw : path.resolve('prisma', raw)
if (!fs.existsSync(source)) throw new Error('Existing database required.')
const folder = path.resolve('backups', new Date().toISOString().replace(/[:.]/g, '-') + '-local-admin-migration')
fs.mkdirSync(folder, { recursive: true })
const backup = path.join(folder, 'database.sqlite')
const scratch = path.join(folder, 'restore-test.sqlite')
const quote = value => '"' + value.replaceAll('"', '""') + '"'
const hash = value => createHash('sha256').update(value).digest('hex')
function snapshot(file, prior) {
  const db = new DatabaseSync(file, { readOnly: true })
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Integrity check failed.')
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key check failed.')
    const tables = prior ? Object.keys(prior) : db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(x => x.name)
    return Object.fromEntries(tables.map(table => {
      const columns = prior?.[table].columns ?? db.prepare('PRAGMA table_info(' + quote(table) + ')').all().map(x => x.name)
      const stmt = db.prepare('SELECT ' + columns.map(quote).join(',') + ' FROM ' + quote(table)); stmt.setReadBigInts(true)
      const rows = stmt.all().map(x => JSON.stringify(x, (_, v) => typeof v === 'bigint' ? v.toString() : v)).sort()
      return [table, { columns, count: rows.length, hash: hash(rows.join('\n')) }]
    }))
  } finally { db.close() }
}
const before = snapshot(source)
const db = new DatabaseSync(source)
try { db.exec("VACUUM INTO '" + backup.replaceAll("'", "''") + "'") } finally { db.close() }
fs.copyFileSync(backup, scratch)
if (JSON.stringify(snapshot(scratch, before)) !== JSON.stringify(before)) throw new Error('Restored backup differs.')
const manifest = { backup, sha256: hash(fs.readFileSync(backup)), tables: before, restoreVerified: true }
fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2))
function migrate(file) {
  const result = spawnSync(process.execPath, ['scripts/prisma-command.cjs', 'db', 'push', '--skip-generate'], { env: { ...process.env, DATABASE_URL: 'file:' + file.replaceAll('\\', '/') }, stdio: 'inherit', windowsHide: true })
  if (result.status !== 0) throw new Error('Migration failed; backup retained.')
  if (JSON.stringify(snapshot(file, before)) !== JSON.stringify(before)) throw new Error('Original records changed; backup retained.')
}
migrate(scratch)
console.log('Backup restored and trial migration verified; applying to local database.')
migrate(source)
manifest.migrationVerified = true
fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('Backup: ' + folder)
console.log('All original table rows and values preserved.')
