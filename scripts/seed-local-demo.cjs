// Setup must not overwrite existing accounts/content just to start the application.
require('@next/env').loadEnvConfig(process.cwd())
if (process.env.ALLOW_DEMO_SEED !== 'true') {
  console.log('Demo seed skipped. Existing accounts/content are preserved. See docs/ADMIN-SECURITY.md for isolated demo setup.')
} else {
  const result = require('node:child_process').spawnSync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], { stdio: 'inherit', env: process.env, windowsHide: true })
  process.exitCode = result.status ?? 1
}
