const {spawnSync}=require('node:child_process');
const path=require('node:path');
require('@next/env').loadEnvConfig(process.cwd());
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1);}
if(process.env.UI_PREVIEW_ONLY==='true'){
  // A fresh sample database created in the build, never the user's SQLite file.
  process.env.DATABASE_URL='file:'+path.join(process.cwd(),'prisma','preview.db');
  run(['scripts/prisma-command.cjs','generate']);
  run(['scripts/prisma-command.cjs','db','push','--skip-generate']);
  run(['--import','tsx','prisma/seed.ts']);
}else{run(['scripts/prisma-command.cjs','generate']);}
run([require.resolve('next/dist/bin/next'),'build']);
