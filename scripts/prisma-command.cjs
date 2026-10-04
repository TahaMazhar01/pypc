const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL || '';
const sqlite = url.startsWith('file:');
if (process.env.VERCEL && sqlite && process.env.UI_PREVIEW_ONLY !== 'true') {
  console.error('Vercel requires a hosted DATABASE_URL. Local SQLite is not persistent on Vercel.');
  process.exit(1);
}
if (!sqlite && !/^(postgres(ql)?:|prisma:\/\/|prisma\+postgres:\/\/)/.test(url)) {
  console.error('Set DATABASE_URL to a PostgreSQL connection URL, or file:./dev.db for local development.');
  process.exit(1);
}
let schema = 'prisma/schema.prisma';
if (sqlite) {
  schema = 'prisma/schema.local.prisma';
  fs.writeFileSync(schema, fs.readFileSync('prisma/schema.prisma', 'utf8').replace('provider = "postgresql"', 'provider = "sqlite"'));
}
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...process.argv.slice(2), '--schema', path.resolve(schema)], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
