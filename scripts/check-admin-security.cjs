/* Synthetic-only integration suite. Never reads the configured DATABASE_URL.
 * Starts its own loopback server and owns a fresh database under reports/.
 * Run after npm run db:generate (SQLite client) with npm run test:security.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const net = require('node:net')
const { spawn, spawnSync } = require('node:child_process')
const { randomBytes } = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const sharp = require('sharp')
const { SignJWT } = require('jose')
let passed = 0; let server; let db
const preview = process.argv.includes('--preview')
const production = process.argv.includes('--production')
if (preview && production) throw new Error('Preview and production checks are separate modes.')
const reportRoot = path.resolve('reports')
fs.mkdirSync(reportRoot, { recursive: true })
const runDir = fs.mkdtempSync(path.join(reportRoot, 'admin-security-'))
const databaseUrl = 'file:' + path.join(runDir, 'synthetic.db').replaceAll('\\','/')
const secret = randomBytes(48).toString('hex')
const password = randomBytes(24).toString('base64url') + '9aA!'
const accounts = {}; const cookies = {}; const results = []
async function check(name, work) { await work(); passed++; results.push(name); console.log('PASS ' + name) }
async function main() {
  const port = await new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })
  const base = 'http://127.0.0.1:' + port
  const env = { ...process.env, DATABASE_URL: databaseUrl, UI_PREVIEW_ONLY: 'false', AUTH_SECRET: secret, AUDIT_CHAIN_SECRET: secret, NEXT_PUBLIC_APP_URL: base, TRUST_PROXY_HEADERS: 'false', SESSION_COOKIE_NAME: 'pypc_security_test', NODE_ENV: production ? 'production' : 'development', EMAIL_DEV_MODE: 'false', PAYMENTS_SIMULATION_MODE: 'false', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', SMTP_PASSWORD: '', OPENAI_API_KEY: '', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', BLOB_READ_WRITE_TOKEN: '', NEXT_TELEMETRY_DISABLED: '1', PYPC_LOCAL_OUTPUT: preview ? 'admin-preview' : '' }
  const expectedSchema = fs.readFileSync('prisma/schema.prisma', 'utf8').replace('provider = "postgresql"', 'provider = "sqlite"').replaceAll('\r\n', '\n').trim()
  const generatedSchemaPath = path.resolve('node_modules/.prisma/client/schema.prisma')
  const generatedSchema = fs.existsSync(generatedSchemaPath) ? fs.readFileSync(generatedSchemaPath, 'utf8').replaceAll('\r\n', '\n').trim() : ''
  // Reuse only an exact matching generated schema, avoiding Windows DLL locks
  // when the independent synthetic preview is running at the same time.
  const schemaTokens = value => value.replace(/("(?:\\.|[^"\\])*")|\s+/g, (match, quoted) => quoted || '')
  if (schemaTokens(generatedSchema) !== schemaTokens(expectedSchema)) {
    const generate = spawnSync(process.execPath, ['scripts/prisma-command.cjs','generate'], { env, encoding: 'utf8', windowsHide: true })
    assert.equal(generate.status, 0, 'Synthetic Prisma client generation failed.')
  }
  const setup = spawnSync(process.execPath, ['scripts/prisma-command.cjs','db','push','--skip-generate'], { env, encoding: 'utf8', windowsHide: true })
  assert.equal(setup.status, 0, 'Synthetic database setup failed: ' + setup.stderr)
  db = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  for (const role of ['ADMIN','SUPER_ADMIN','DIRECTOR','AMBASSADOR','GRAPHIC_DESIGNER','DEVELOPER','EMPLOYEE','MEMBER','MODERATOR']) {
    accounts[role] = await db.user.create({ data: { email: role.toLowerCase() + '@example.invalid', firstName: 'Synthetic', lastName: role, role, status: 'ACTIVE', emailVerifiedAt: new Date(), passwordHash: bcrypt.hashSync(password, 10) } })
  }
  const log = fs.openSync(path.join(runDir, 'server.log'), 'a')
  if (production) {
    const buildLog = fs.openSync(path.join(runDir, 'build.log'), 'a')
    console.log('Building production bundle against the fresh synthetic database. Log: ' + path.relative(process.cwd(), path.join(runDir, 'build.log')))
    const build = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], { env, stdio: ['ignore',buildLog,buildLog], windowsHide: true })
    fs.closeSync(buildLog)
    assert.equal(build.status, 0, 'Production build failed; see the isolated build.log.')
  }
  server = spawn(process.execPath, [require.resolve('next/dist/bin/next'),production ? 'start' : 'dev','-H','127.0.0.1','-p',String(port)], { env, stdio: ['ignore',log,log], windowsHide: true })
  server.on('error', error => console.error('Server failed:', error.message))
  const request = async (url, role, method = 'GET', data, extra = {}) => {
    const headers = { ...(role ? { Cookie: cookies[role] } : {}), ...(method !== 'GET' ? { Origin: base, 'Content-Type': 'application/json' } : {}), ...extra }
    const response = await fetch(base + url, { method, headers, ...(data !== undefined ? { body: typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data) } : {}), redirect: 'manual' })
    const text = await response.text(); let body; try { body = JSON.parse(text) } catch { body = null }
    return { status: response.status, body, text, headers: response.headers }
  }
  for (let tries = 0; ; tries++) { try { await fetch(base + '/login'); break } catch { if (tries > 90 || server.exitCode !== null) throw new Error('Test server did not start; see server.log'); await new Promise(r => setTimeout(r,1000)) } }
  if (preview) {
    const accessFile = path.join(runDir, 'preview-access.json')
    fs.writeFileSync(accessFile, JSON.stringify({ url: base + '/login', email: accounts.ADMIN.email, password, syntheticOnly: true }, null, 2), { mode: 0o600 })
    const ready = await fetch(base + '/login')
    assert.equal(ready.status, 200, 'Preview login must respond successfully.')
    const summary = { url: base + '/admin', loginUrl: base + '/login', accessFile, runDir, runnerPid: process.pid, serverPid: server.pid, syntheticOnly: true }
    fs.writeFileSync(path.join(reportRoot, 'admin-preview-result.json'), JSON.stringify(summary, null, 2))
    console.log('Synthetic preview ready: ' + summary.url + '\nLocal access details: ' + path.relative(process.cwd(), accessFile))
    console.log('Close this preview process to stop its loopback server. No existing data is used.')
    try {
      const evidence = await require('./check-admin-browser.cjs')({ base, email: accounts.ADMIN.email, password, runDir })
      fs.writeFileSync(path.join(reportRoot, 'admin-preview-result.json'), JSON.stringify({ ...summary, ...evidence }, null, 2))
      console.log('Browser checks and screenshots completed.')
    } catch (error) { console.error('Browser evidence failed; local preview remains available:', error.message) }
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
    fs.rmSync(accessFile, { force: true })
    return
  }
  const login = async role => {
    const result = await request('/api/auth/login', null, 'POST', { email: accounts[role].email, password })
    assert.equal(result.status,200, role + ' login: ' + result.text)
    const cookie = result.headers.get('set-cookie'); assert.ok(cookie?.includes('HttpOnly')); assert.ok(cookie?.includes('SameSite=lax'))
    if (production) assert.ok(cookie?.includes('Secure'), 'Production session must use Secure cookies')
    cookies[role] = cookie.split(';')[0]; return cookies[role]
  }
  for (const role of Object.keys(accounts)) await check(role + ' verified login and protected cookie', () => login(role))
  await check('anonymous admin page redirects to login', async () => assert.equal((await request('/admin',null)).status,307))
  await check('anonymous API denied', async () => assert.equal((await request('/api/admin/roles',null)).status,401))
  const matrix = {
    ADMIN: [true,true,true,true,true,true], SUPER_ADMIN: [true,true,true,true,true,true], DIRECTOR: [true,true,true,true,true,false],
    AMBASSADOR: [false,true,false,false,false,false], GRAPHIC_DESIGNER: [true,false,false,false,true,false], DEVELOPER: [false,false,false,false,false,false], EMPLOYEE: [false,false,false,false,false,false], MEMBER: [false,false,false,false,false,false], MODERATOR: [true,true,true,true,true,false]
  }
  const endpoints = ['/api/admin/content?entity=homepage','/api/admin/content?entity=event','/api/admin/content?entity=programme','/api/admin/content?entity=opportunity','/api/admin/media','/api/admin/roles']
  for (const [role, access] of Object.entries(matrix)) for (let i=0;i<endpoints.length;i++) await check(role + ' ' + endpoints[i], async () => assert.equal((await request(endpoints[i],role)).status,access[i] ? 200 : 403))
  await check('developer overview does not leak users, finance or audit', async () => { const r = await request('/admin','DEVELOPER'); assert.equal(r.status,200); assert.ok(!r.text.includes('admin@example.invalid')); assert.ok(!r.text.includes('Recent administrative activity')); assert.ok(!r.text.includes('PKR revenue')) })
  await check('member cannot read user directory by direct URL', async () => { const r = await request('/admin/users','MEMBER'); assert.ok([200,307].includes(r.status)); assert.ok(!r.text.includes('admin@example.invalid')); assert.ok(!r.text.includes('Member directory')) })
  for (const headers of [{ Origin:'https://hostile.invalid' }, { Origin:'null' }, { Origin:'' }, { Origin:base.replace('http:','https:') }]) await check('origin rejection ' + headers.Origin, async () => assert.equal((await request('/api/admin/users','ADMIN','PATCH',{ userId:accounts.MEMBER.id,role:'ADMIN' },headers)).status,403))
  await check('public registration cannot assign role', async () => assert.equal((await request('/api/auth/register',null,'POST',{ role:'ADMIN' })).status,422))
  await check('member profile rejects privilege fields', async () => assert.equal((await request('/api/dashboard/profile','MEMBER','PATCH',{ role:'ADMIN',firstName:'Synthetic',lastName:'Member' })).status,422))
  await check('private document ID cannot bypass ownership', async () => { const url='/api/uploads/resume/'+accounts.MEMBER.id+'-00000000-0000-4000-8000-000000000001.pdf';assert.equal((await request(url,null)).status,401);assert.equal((await request(url,'DEVELOPER')).status,403);assert.equal((await request(url,'DIRECTOR')).status,403) })
  await check('certificate directory rejects unauthorized all scope', async () => assert.equal((await request('/api/certificates?scope=all','MEMBER')).status,403))
  await check('non-admin cannot mutate users', async () => assert.equal((await request('/api/admin/users','DIRECTOR','PATCH',{ userId:accounts.MEMBER.id,role:'ADMIN' })).status,403))
  await check('client role header does not grant authority', async () => assert.equal((await request('/api/admin/roles','DEVELOPER','GET',undefined,{ 'x-role':'ADMIN' })).status,403))
  await check('database role overrides signed token role', async () => {
    const session = await db.authSession.findFirst({ where:{ userId:accounts.MEMBER.id } })
    const forged = await new SignJWT({ userId:accounts.MEMBER.id,email:accounts.MEMBER.email,role:'ADMIN',version:0,sessionId:session.id }).setJti(session.id).setIssuer('pypc.org.pk').setProtectedHeader({alg:'HS256'}).setExpirationTime('1h').sign(new TextEncoder().encode(secret))
    assert.equal((await request('/api/admin/roles',null,'GET',undefined,{ Cookie:'pypc_security_test='+forged })).status,403)
  })
  await check('malformed JSON rejected', async () => assert.equal((await request('/api/admin/roles','ADMIN','POST','{')).status,400))
  await check('oversized content rejected', async () => assert.equal((await request('/api/admin/content','ADMIN','POST',' '.repeat(110000))).status,413))
  await check('reserved role names rejected', async () => assert.equal((await request('/api/admin/roles','ADMIN','POST',{ name:'ADMIN', permissions:['dashboard.read'] })).status,422))
  await check('custom role governance escalation rejected', async () => assert.equal((await request('/api/admin/roles','ADMIN','POST',{ name:'Unsafe role', permissions:['dashboard.read','roles.manage'] })).status,403))
  let custom
  await check('administrator creates granular role', async () => { const r = await request('/api/admin/roles','ADMIN','POST',{ name:'Synthetic event reader',permissions:['dashboard.read','events.read'] }); assert.equal(r.status,201); custom=r.body.role })
  const oldEmployeeCookie=cookies.EMPLOYEE
  await check('role assignment revokes existing sessions', async () => {
    assert.equal((await request('/api/admin/users','ADMIN','PATCH',{ userId:accounts.EMPLOYEE.id,role:'CUSTOM',customRoleId:custom.id })).status,200)
    assert.equal((await request('/api/admin/content?entity=event','EMPLOYEE')).status,401)
    await login('EMPLOYEE'); assert.notEqual(cookies.EMPLOYEE,oldEmployeeCookie)
    assert.equal((await request('/api/admin/content?entity=event','EMPLOYEE')).status,200)
    assert.equal((await request('/api/admin/content?entity=homepage','EMPLOYEE')).status,403)
  })
  await check('cannot delete an assigned role', async () => assert.equal((await request('/api/admin/roles','ADMIN','DELETE',{id:custom.id,version:custom.version})).status,409))
  await check('role permission changes revoke affected sessions', async () => { const r=await request('/api/admin/roles','ADMIN','PATCH',{id:custom.id,version:custom.version,name:custom.name,permissions:['dashboard.read']});assert.equal(r.status,200);assert.equal((await request('/api/admin/content?entity=event','EMPLOYEE')).status,401) })
  await check('stale role revision rejected', async () => assert.equal((await request('/api/admin/roles','ADMIN','PATCH',{id:custom.id,version:custom.version,name:custom.name,permissions:['dashboard.read']})).status,409))
  await check('admin cannot grant super admin', async () => assert.equal((await request('/api/admin/users','ADMIN','PATCH',{userId:accounts.MEMBER.id,role:'SUPER_ADMIN'})).status,403))
  await check('self-demotion rejected', async () => assert.equal((await request('/api/admin/users','ADMIN','PATCH',{userId:accounts.ADMIN.id,role:'MEMBER'})).status,409))
  const event = {slug:'synthetic-test-event',title:'Synthetic event',description:'An isolated synthetic security test event.',eventType:'Workshop',mode:'Online',venue:null,city:null,startsAt:'2027-05-01T10:00:00.000Z',endsAt:'2027-05-01T12:00:00.000Z',registrationDeadline:null,capacity:100,isFeatured:false}
  let draft
  await check('ambassador cannot save event draft', async () => assert.equal((await request('/api/admin/content','AMBASSADOR','POST',{entity:'event',version:0,data:event})).status,403))
  await check('director saves event draft without publication', async () => { const r=await request('/api/admin/content','DIRECTOR','POST',{entity:'event',version:0,data:event});assert.equal(r.status,201,r.text);draft=r.body;assert.equal(await db.event.count(),0) })
  await check('unknown content fields rejected', async () => assert.equal((await request('/api/admin/content','DIRECTOR','POST',{entity:'event',version:0,data:{...event,isPublished:true}})).status,422))
  await check('invalid event dates rejected', async () => assert.equal((await request('/api/admin/content','DIRECTOR','POST',{entity:'event',version:0,data:{...event,endsAt:'2026-01-01T00:00:00.000Z'}})).status,422))
  await check('unknown target ID rejected', async () => assert.equal((await request('/api/admin/content','DIRECTOR','POST',{entity:'event',id:'does-not-exist',version:0,data:event})).status,404))
  await check('stale draft save rejected', async () => assert.equal((await request('/api/admin/content','DIRECTOR','POST',{entity:'event',id:draft.id,version:0,data:event})).status,409))
  await check('editor without publish permission denied', async () => assert.equal((await request('/api/admin/content','MODERATOR','PATCH',{entity:'event',id:draft.id,version:draft.version,action:'publish'})).status,403))
  await check('director publishes saved event', async () => { const r=await request('/api/admin/content','DIRECTOR','PATCH',{entity:'event',id:draft.id,version:draft.version,action:'publish'});assert.equal(r.status,200,r.text);assert.equal((await db.event.findUnique({where:{id:draft.id}})).isPublished,true) })
  await check('published event page accessible', async () => { const r=await request('/events/'+event.slug,null);assert.equal(r.status,200);assert.ok(r.text.includes(event.title)) })
  await check('saved changes to published event stay private', async () => { const r=await request('/api/admin/content','DIRECTOR','POST',{entity:'event',id:draft.id,version:draft.version+1,data:{...event,title:'Private changed title'}});assert.equal(r.status,200);draft=r.body;assert.equal((await db.event.findUnique({where:{id:draft.id}})).title,event.title) })
  await check('unpublish preserves existing registrations', async () => {
    await db.eventRegistration.create({data:{eventId:draft.id,userId:accounts.MEMBER.id}})
    assert.equal((await request('/api/admin/content','DIRECTOR','PATCH',{entity:'event',id:draft.id,version:draft.version,action:'unpublish'})).status,200)
    assert.equal(await db.eventRegistration.count({where:{eventId:draft.id}}),1)
    const hidden=await request('/events/'+event.slug,null)
    assert.ok([200,404].includes(hidden.status)) // App Router can stream a not-found boundary with 200.
    assert.ok(!hidden.text.includes(event.title), 'Unpublished title must not leak through HTML or metadata.')
    assert.ok(!hidden.text.includes(event.description), 'Unpublished description must not leak.')
  })
  const png=await sharp({create:{width:20,height:20,channels:3,background:'#123456'}}).png().toBuffer()
  let asset
  await check('developer cannot upload media', async () => assert.equal((await request('/api/admin/media','DEVELOPER','POST',png,{'Content-Type':'image/png','x-image-alt':'Synthetic image'})).status,403))
  await check('SVG media rejected', async () => assert.equal((await request('/api/admin/media','GRAPHIC_DESIGNER','POST','<svg/>',{'Content-Type':'image/svg+xml','x-image-alt':'Synthetic image'})).status,415))
  await check('spoofed raster MIME rejected', async () => assert.equal((await request('/api/admin/media','GRAPHIC_DESIGNER','POST','<script>alert(1)</script>',{'Content-Type':'image/png','x-image-alt':'Synthetic image'})).status,422))
  await check('oversized upload rejected', async () => assert.equal((await request('/api/admin/media','GRAPHIC_DESIGNER','POST',Buffer.alloc(5*1024*1024+1),{'Content-Type':'image/png','x-image-alt':'Synthetic image'})).status,413))
  await check('valid media re-encoded with generated identifier', async () => { const r=await request('/api/admin/media','GRAPHIC_DESIGNER','POST',png,{'Content-Type':'image/png','x-image-alt':'Synthetic image','x-filename':'../../escape.png'});assert.equal(r.status,201,r.text);asset=r.body.media;assert.equal(asset.mimeType,'image/webp');assert.match(asset.id,/^[a-f0-9-]{36}$/) })
  await check('unpublished media private', async () => { assert.equal((await request('/api/media/'+asset.id,null)).status,404);assert.equal((await request('/api/media/'+asset.id,'DEVELOPER')).status,404);assert.equal((await request('/api/media/'+asset.id,'GRAPHIC_DESIGNER')).status,200) })
  const home=(await request('/api/admin/content?entity=homepage','ADMIN')).body.items[0]
  let homeDraft
  await check('homepage rejects script URLs', async () => assert.equal((await request('/api/admin/content','GRAPHIC_DESIGNER','POST',{entity:'homepage',id:home.id,version:0,data:{...home.values,href:'javascript:alert(1)'}})).status,422))
  await check('homepage rejects image path traversal', async () => assert.equal((await request('/api/admin/content','GRAPHIC_DESIGNER','POST',{entity:'homepage',id:home.id,version:0,data:{...home.values,image:'/images/editorial/../../secret.png'}})).status,422))
  await check('designer saves picture draft', async () => { const r=await request('/api/admin/content','GRAPHIC_DESIGNER','POST',{entity:'homepage',id:home.id,version:0,data:{...home.values,image:'/api/media/'+asset.id,title:'<script>unsafe text</script>'}});assert.equal(r.status,200,r.text);homeDraft=r.body;assert.equal(await db.homepageItem.count(),0) })
  await check('designer cannot publish picture', async () => assert.equal((await request('/api/admin/content','GRAPHIC_DESIGNER','PATCH',{entity:'homepage',id:homeDraft.id,version:homeDraft.version,action:'publish'})).status,403))
  await check('admin publishes picture; media becomes public', async () => { assert.equal((await request('/api/admin/content','ADMIN','PATCH',{entity:'homepage',id:homeDraft.id,version:homeDraft.version,action:'publish'})).status,200); assert.equal((await request('/api/media/'+asset.id,null)).status,200) })
  await check('public homepage escapes editorial text', async () => { const r=await request('/',null);assert.equal(r.status,200);assert.ok(!r.text.includes('<script>unsafe text</script>'));assert.ok(r.text.includes('&lt;script&gt;unsafe text&lt;/script&gt;')) })
  await check('referenced media cannot be deleted', async () => assert.equal((await request('/api/admin/media','ADMIN','DELETE',{id:asset.id})).status,409))
  await check('unpublishing withdraws media public access', async () => { assert.equal((await request('/api/admin/content','ADMIN','PATCH',{entity:'homepage',id:homeDraft.id,version:homeDraft.version+1,action:'unpublish'})).status,200);assert.equal((await request('/api/media/'+asset.id,null)).status,404) })
  await check('legacy admin mutations require resource permission', async () => { for(const route of ['applications','certificates','partnerships','visa-letters']) assert.equal((await request('/api/admin/'+route,'DEVELOPER','PATCH',{})).status,403) })
  await check('legacy admin mutation rejects cross-origin', async () => assert.equal((await request('/api/admin/applications','ADMIN','PATCH',{}, {Origin:'https://hostile.invalid'})).status,403))
  await require('./check-admin-crud.cjs')({ db, request, accounts, check })
  if (process.argv.includes('--browser')) {
    const evidence = await require('./check-admin-workspace-browser.cjs')({ base, email: accounts.ADMIN.email, password, runDir })
    fs.writeFileSync(path.join(reportRoot, 'admin-workspace-browser-result.json'), JSON.stringify(evidence, null, 2))
  }
  await check('logout revokes token replay', async () => { assert.equal((await request('/api/auth/logout','DIRECTOR','POST',{})).status,200);assert.equal((await request('/api/admin/content?entity=event','DIRECTOR')).status,401) })
  await check('admin can revoke all user sessions', async () => { assert.equal((await request('/api/admin/users','ADMIN','PATCH',{userId:accounts.AMBASSADOR.id,revokeSessions:true})).status,200);assert.equal((await request('/api/admin/content?entity=event','AMBASSADOR')).status,401) })
  await check('expired server session rejected', async () => { await db.authSession.updateMany({where:{userId:accounts.GRAPHIC_DESIGNER.id},data:{expiresAt:new Date(0)}});assert.equal((await request('/api/admin/media','GRAPHIC_DESIGNER')).status,401) })
  await check('suspended account sessions rejected', async () => { assert.equal((await request('/api/admin/users','ADMIN','PATCH',{userId:accounts.DEVELOPER.id,status:'SUSPENDED'})).status,200);assert.equal((await request('/api/admin/roles','DEVELOPER')).status,401) })
  await check('audit committed for every new administrative mutation', async () => { for(const action of ['ROLE_CREATED','ROLE_UPDATED','ADMIN_USER_UPDATED','CONTENT_DRAFT_SAVED','CONTENT_PUBLISH','CONTENT_UNPUBLISH','MEDIA_UPLOADED','ADMIN_SESSIONS_REVOKED']) assert.ok(await db.auditLog.count({where:{action}}), action) })
  await check('last active admin cannot be removed concurrently', async () => {
    const second=await db.user.create({data:{email:'second-admin@example.invalid',firstName:'Synthetic',lastName:'Second',role:'ADMIN',status:'ACTIVE',emailVerifiedAt:new Date(),passwordHash:bcrypt.hashSync(password,10)}})
    accounts.SECOND=second; await db.rateLimitCounter.deleteMany();await login('SECOND')
    await db.user.update({where:{id:accounts.SUPER_ADMIN.id},data:{status:'SUSPENDED'}})
    const responses=await Promise.all([request('/api/admin/users','ADMIN','PATCH',{userId:second.id,role:'MEMBER'}),request('/api/admin/users','SECOND','PATCH',{userId:accounts.ADMIN.id,role:'MEMBER'})])
    assert.equal(responses.filter(r=>r.status===200).length,1,JSON.stringify(responses.map(r=>({status:r.status,body:r.body}))))
    assert.equal(await db.user.count({where:{role:{in:['ADMIN','SUPER_ADMIN']},status:'ACTIVE'}}),1)
  })
  await check('login lockout limits repeated guesses', async () => { await db.rateLimitCounter.deleteMany();const statuses=[];for(let i=0;i<7;i++)statuses.push((await request('/api/auth/login',null,'POST',{email:accounts.MEMBER.email,password:'WrongPassword!123'})).status);assert.ok(statuses.includes(423)||statuses.includes(429)) })
  fs.writeFileSync(path.join(reportRoot,'admin-security-result.json'),JSON.stringify({passed,checks:results,syntheticOnly:true,productionBuild:production,nextVersion:require('next/package.json').version,completedAt:new Date().toISOString()},null,2))
  console.log(passed + ' security checks passed. Synthetic database only. Server log: ' + path.relative(process.cwd(),path.join(runDir,'server.log')))
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(async()=>{if(server)server.kill();if(db)await db.$disconnect()})
