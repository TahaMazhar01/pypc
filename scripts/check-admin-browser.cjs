/* Browser evidence for the isolated synthetic preview. Uses an installed browser
 * with a fresh in-memory context, never the user's browser profile. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright-core')

module.exports = async function checkAdminBrowser({ base, email, password, runDir }) {
  const candidates = [process.env.PYPC_TEST_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean)
  const executablePath = candidates.find(file => fs.existsSync(file))
  if (!executablePath) throw new Error('Set PYPC_TEST_BROWSER to an installed Chromium browser executable.')
  const browser = await chromium.launch({ executablePath, headless: true })
    const screenshots = []
  const checks = []
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort())
    const page = await context.newPage()
    page.setDefaultTimeout(30000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    async function visit(route) { console.log('Browser check: ' + route); const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 120000 }); assert.equal(response.status(), 200, route) }
    async function capture(name) { console.log('Browser capture: ' + name); await page.evaluate(() => window.scrollTo(0, 0)); const file = path.join(runDir, name + '.png'); await page.screenshot({ path: file, fullPage: true, animations: 'disabled', timeout: 30000 }); screenshots.push(file) }
    await visit('/login')
    await page.locator('input[type=email]').fill(email)
    await page.locator('input[name=password]').fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(url => url.pathname === '/admin', { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.getByRole('heading', { name: 'Welcome, Synthetic', exact: true }).waitFor()
    checks.push('Real login form creates an authenticated dashboard session')
    await capture('admin-desktop')

    await visit('/admin/roles')
    const fixtureId = Date.now().toString(36)
    await page.getByLabel('Role name', { exact: true }).fill('Preview event reviewer ' + fixtureId)
    await page.locator('fieldset').filter({ has: page.getByText('events', { exact: true }) }).getByLabel('read', { exact: true }).check()
    await page.getByRole('button', { name: 'Save role', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Role saved.' }).waitFor()
    checks.push('Custom role form saves selected resource permissions')
    await capture('admin-roles-desktop')

    await visit('/admin/events')
    await page.getByRole('button', { name: '+ Add event', exact: true }).click()
    await page.getByLabel('Slug', { exact: true }).fill('preview-youth-leadership-workshop-' + fixtureId)
    await page.getByLabel('Title', { exact: true }).fill('Preview: Youth Leadership Workshop')
    await page.getByLabel('Description', { exact: true }).fill('Synthetic preview event for reviewing the PYPC content dashboard. This is not a real scheduled event.')
    await page.getByLabel('Starts At (UTC)', { exact: true }).fill('2027-05-01T10:00')
    await page.getByLabel('City', { exact: true }).fill('Islamabad')
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Draft saved.' }).waitFor()
    await page.getByRole('button', { name: 'Publish saved draft', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Published successfully.' }).waitFor()
    checks.push('Event form saves a draft and publishes it through separate controls')
    await capture('admin-events-desktop')

    await visit('/admin/content')
    await page.getByRole('region', { name: 'Content list' }).getByRole('button').first().click()
    const title = page.getByLabel('Title', { exact: true })
    await title.fill((await title.inputValue()) === 'Preview: Youth voices shaping the future' ? 'Preview: Building the next generation of leaders' : 'Preview: Youth voices shaping the future')
    await page.getByRole('button', { name: 'Save draft', exact: true }).click()
    await page.getByRole('status').filter({ hasText: 'Draft saved.' }).waitFor()
    checks.push('Existing homepage card edits remain drafts until publication')
    await capture('admin-content-desktop')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Content editor must fit mobile viewport')
    checks.push('Homepage editor fits a 390px mobile viewport')
    await capture('admin-content-mobile')
    await visit('/admin')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Dashboard must fit mobile viewport')
    checks.push('Dashboard fits a 390px mobile viewport')
    await capture('admin-mobile')
    assert.deepEqual(errors, [], 'Browser runtime errors')
    checks.push('No browser runtime errors during tested flows')
    return { browser: executablePath.includes('Edge') ? 'Microsoft Edge' : 'Chromium', browserVersion: browser.version(), checks, screenshots }
  } finally { await browser.close() }
}

if (require.main === module) {
  const summaryFile = path.resolve(process.argv[2] || 'reports/admin-preview-result.json')
  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'))
  const access = JSON.parse(fs.readFileSync(summary.accessFile, 'utf8'))
  if (!summary.syntheticOnly || !access.syntheticOnly || new URL(summary.url).hostname !== '127.0.0.1') throw new Error('Only an isolated local synthetic preview is supported.')
  module.exports({ base: new URL(summary.url).origin, email: access.email, password: access.password, runDir: summary.runDir })
    .then(evidence => { fs.writeFileSync(summaryFile, JSON.stringify({ ...summary, ...evidence }, null, 2)); console.log('Browser checks passed: ' + evidence.checks.length) })
    .catch(error => { console.error(error.message); process.exitCode = 1 })
}
