// Imports a private, verified SQLite JSON backup into an EMPTY PostgreSQL database.
// Existing destination data is never overwritten. Every insert is one transaction.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run db:import:sqlite -- backups/<folder>/database.json');
  const url = process.env.POSTGRES_DATABASE_URL;
  if (!url || !/^postgres(ql)?:\/\//.test(url)) throw new Error('Set POSTGRES_DATABASE_URL locally to the direct PostgreSQL connection URL.');
  const contents = fs.readFileSync(file);
  const sums = fs.readFileSync(path.join(path.dirname(file), 'SHA256SUMS'), 'utf8');
  const hash = crypto.createHash('sha256').update(contents).digest('hex');
  if (!sums.split(/\r?\n/).includes(`${hash}  database.json`)) throw new Error('Backup checksum mismatch.');
  const backup = JSON.parse(contents);
  if (backup.engine !== 'sqlite') throw new Error('Expected a SQLite export.');
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8').replace('provider = "prisma-client-js"', 'provider = "prisma-client-js"\n  output = "../node_modules/.pypc-postgres"');
  fs.writeFileSync('prisma/schema.import.prisma', schema);
  const generated = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), 'generate', '--schema', 'prisma/schema.import.prisma'], {stdio:'pipe', env:{...process.env,DATABASE_URL:url}});
  if (generated.status !== 0) throw new Error('PostgreSQL import client generation failed.');
  const {PrismaClient, Prisma} = require('../node_modules/.pypc-postgres');
  const models = Prisma.dmmf.datamodel.models;
  if (Object.keys(backup.tables).some(name => !models.some(m => m.name === name)) || models.some(m => !Array.isArray(backup.tables[m.name]))) throw new Error('Backup tables do not match the current schema.');
  const ordered = [];
  const pending = [...models];
  while (pending.length) {
    const i = pending.findIndex(m => m.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length).every(f => ordered.some(o => o.name === f.type)));
    if (i < 0) throw new Error('Unsupported cyclic model dependencies.');
    ordered.push(pending.splice(i, 1)[0]);
  }
  const db = new PrismaClient({datasources:{db:{url}}});
  try {
    await db.$transaction(async tx => {
      // Prevent concurrent writes while checking emptiness and importing.
      await tx.$executeRawUnsafe(`LOCK TABLE ${models.map(m => '"'+m.name+'"').join(', ')} IN ACCESS EXCLUSIVE MODE`);
      for (const m of models) if (await tx[m.name[0].toLowerCase()+m.name.slice(1)].count()) throw new Error('Destination must be empty; import cancelled.');
      for (const m of ordered) {
        const delegate = tx[m.name[0].toLowerCase()+m.name.slice(1)];
        for (const row of backup.tables[m.name]) {
          const data = {};
          for (const f of m.fields.filter(f => f.kind !== 'object')) {
            const v = row[f.name];
            if (v === undefined) throw new Error(`Missing field in backup: ${m.name}.${f.name}`);
            data[f.name] = v == null ? null : f.type === 'DateTime' ? new Date(v) : f.type === 'Boolean' ? Boolean(v) : v;
          }
          await delegate.create({data});
        }
        if (await delegate.count() !== backup.tables[m.name].length) throw new Error('Imported count mismatch.');
      }
    }, {timeout:120000,maxWait:10000});
    console.log(`Import complete: ${models.length} tables; IDs, password hashes and audit records preserved.`);
  } finally {await db.$disconnect();}
}
main().catch(error => {
  // Prisma errors can include connection details. Never print raw errors here.
  console.error('Import failed. No partial import is committed. Check destination migrations, emptiness and connectivity.');
  if (!error.code && !error.clientVersion) console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exitCode=1;
});
