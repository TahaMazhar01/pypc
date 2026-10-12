/* Uses the existing isolated preview. Never reseeds or replaces its database. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')
const { PrismaClient } = require('@prisma/client')
const { chromium } = require('playwright-core')
let testStage = 'initialization'
async function main() {
  const preview = JSON.parse(fs.readFileSync('reports/admin-preview-result.json', 'utf8'))
  assert.equal(preview.syntheticOnly, true)
  const base = new URL(preview.url).origin
  assert.equal(new URL(base).hostname, '127.0.0.1')
  const access = JSON.parse(fs.readFileSync(preview.accessFile, 'utf8'))
  const output = path.resolve('reports/auth-ui-redesign')
  fs.mkdirSync(output, { recursive: true })
  const executablePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  const browser = await chromium.launch({ executablePath, headless: true })
  const db = new PrismaClient({ datasources: { db: { url: 'file:' + path.join(preview.runDir, 'synthetic.db').replaceAll('\\', '/') } } })
  const accountFields = { id: true, email: true, role: true, status: true, emailVerifiedAt: true, sessionVersion: true, updatedAt: true }
  const accountBefore = await db.user.findUnique({ where: { email: 'tahamazhar01@gmail.com' }, select: accountFields })
  assert.equal(accountBefore?.status, 'ACTIVE')
  assert.equal(accountBefore.role, 'SUPER_ADMIN')
  assert.ok(accountBefore.emailVerifiedAt)
  const checks = [], screenshots = [], errors = []
  checks.push = (...items) => { for (const item of items) console.log('PASS ' + item); return Array.prototype.push.apply(checks, items) }
  try {
    const noJs = await browser.newContext({ javaScriptEnabled: false })
    const initial = await noJs.newPage()
    for (const route of ['/login', '/register']) {
      testStage = route + ' before hydration'
      await initial.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 120000 })
      const form = initial.locator('form.auth-form')
      assert.equal(await form.getAttribute('method'), 'post')
      assert.equal(await form.getAttribute('data-ready'), 'false')
      assert.equal(await form.locator('fieldset').evaluate(node => node.disabled), true)
      assert.equal(await form.locator('button[type=submit]').isDisabled(), true)
      await initial.keyboard.press('Enter')
      assert.equal(new URL(initial.url()).search, '')
      checks.push(route + ' stays disabled before hydration and uses POST instead of URL query submission')
    }
    await noJs.close()
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' })
    const page = await context.newPage()
    page.setDefaultTimeout(30000)
    page.on('pageerror', error => errors.push(error.message))
    async function visit(route) { testStage = route; const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 120000 }); assert.equal(response.status(), 200); await page.locator('h1').first().waitFor(); if (route === '/login' || route === '/register') await page.locator('form.auth-form[data-ready=true]').waitFor(); await page.evaluate(() => document.fonts.ready) }
    async function capture(name, selector = '.auth-page') {
      // Capture the component in one viewport beneath the real sticky header.
      // This avoids element-screenshot auto-scrolling the header over its title.
      const original = page.viewportSize()
      const target = page.locator(selector)
      const height = Math.ceil(await target.evaluate(node => node.getBoundingClientRect().height)) + 145
      await page.setViewportSize({ width: original.width, height })
      await target.evaluate(node => window.scrollTo(0, window.scrollY + node.getBoundingClientRect().top - 110))
      const file = path.join(output, name + '.png')
      await page.screenshot({ path: file, animations: 'disabled', timeout: 60000 })
      screenshots.push(file)
      await page.setViewportSize(original)
    }
    async function fit(label) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ' horizontal overflow'); checks.push(label + ' fits viewport') }
    async function contrast(label) {
      const ratios = await page.evaluate(() => {
        const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4 }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0)
        return [['#login-email', '::placeholder', '#login-email'], ['.auth-tabs a:not([aria-current])', null, '.auth-tabs'], ['.auth-kicker', null, '.auth-card']].map(([selector, pseudo, background]) => {
          const foreground = luminance(getComputedStyle(document.querySelector(selector), pseudo).color)
          const behind = luminance(getComputedStyle(document.querySelector(background)).backgroundColor)
          return (Math.max(foreground, behind) + .05) / (Math.min(foreground, behind) + .05)
        })
      })
      assert.ok(ratios.every(ratio => ratio >= 4.5))
      checks.push(label + ' placeholder, secondary tab and small heading text meet 4.5:1 contrast')
    }

    await visit('/login')
    await page.getByLabel('Email address', { exact: false }).fill('ui-check@example.invalid')
    assert.ok(await page.locator('#login-password').evaluate(input => input.labels.length > 0), 'Password input must have an associated label')
    await page.locator('#login-password').fill('Temporary-UI-Check!21')
    await page.getByRole('button', { name: 'Show password', exact: true }).click()
    assert.equal(await page.locator('#login-password').getAttribute('type'), 'text')
    await page.getByRole('button', { name: 'Hide password', exact: true }).click()
    assert.equal(await page.locator('#login-password').getAttribute('type'), 'password')
    checks.push('Password visibility toggle works and is labelled')
    await page.locator('#login-email').fill('not-an-email')
    await page.locator('#login-password').press('Enter')
    await page.locator('#login-email-error').waitFor()
    assert.equal(await page.locator('#login-email').getAttribute('aria-invalid'), 'true')
    checks.push('Invalid sign-in input has an associated accessible error')
    await page.locator('#login-email').fill('ui-check@example.invalid')
    await page.locator('#login-email').focus()
    await page.keyboard.press('Tab')
    assert.equal(await page.locator('#login-password').evaluate(node => node === document.activeElement), true)
    checks.push('Keyboard Tab moves from email to password')
    let loginRequests = 0, finishLogin
    const loginGate = new Promise(resolve => { finishLogin = resolve })
    await page.route('**/api/auth/login', async route => { loginRequests++; await loginGate; await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Test sign-in was declined.' }) }) })
    const loginRequested = page.waitForRequest(request => request.url() === base + '/api/auth/login')
    await page.locator('#login-password').press('Enter')
    await loginRequested
    assert.equal(await page.locator('form.auth-form fieldset').evaluate(node => node.disabled), true)
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter')
    assert.equal(loginRequests, 1)
    finishLogin()
    await page.getByText('Test sign-in was declined.', { exact: true }).waitFor()
    assert.equal(await page.locator('#login-email').inputValue(), 'ui-check@example.invalid')
    await page.unroute('**/api/auth/login')
    checks.push('Enter submits login once; busy controls prevent repeated submission and failure preserves details (stubbed API)')
    await visit('/login')
    await capture('login-desktop')
    await fit('Desktop login')
    await contrast('Light login')

    await visit('/register')
    await capture('signup-desktop')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.locator('#register-firstName-error').waitFor()
    assert.equal(await page.locator('#register-firstName').getAttribute('aria-invalid'), 'true')
    checks.push('Signup first step rejects missing details with field errors')
    await page.locator('#register-firstName').fill('Preview')
    await page.locator('#register-lastName').fill('Reviewer')
    await page.locator('#register-email').fill('ui-check@example.invalid')
    await page.locator('#register-country').focus()
    await page.keyboard.press('Enter')
    await page.getByRole('combobox', { name: 'Search countries' }).fill('Pakistan')
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    assert.equal(await page.locator('#register-country').evaluate(node => node === document.activeElement), true)
    await page.keyboard.press('Enter')
    await page.getByRole('combobox', { name: 'Search countries' }).waitFor()
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('#register-country').getAttribute('aria-expanded'), 'false')
    checks.push('Country picker supports keyboard search, selection, Escape and focus restoration')
    await page.locator('#register-phone').fill('03001234567')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('heading', { name: 'Keep your account secure.', exact: true }).waitFor()
    await page.locator('#register-password').fill('Harbor!72CobaltRiver')
    await page.locator('#register-confirmPassword').fill('Harbor!72CobaltRiver')
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    assert.equal(await page.locator('#register-email').inputValue(), 'ui-check@example.invalid')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    assert.equal(await page.locator('#register-password').inputValue(), 'Harbor!72CobaltRiver')
    checks.push('Signup step navigation preserves entered details and passwords')
    await page.locator('#human-question').waitFor()
    const numbers = (await page.locator('#human-question').innerText()).match(/\d+/g).map(Number)
    await page.locator('#human-answer').fill(String(numbers[0] + numbers[1]))
    await page.locator('input[name=acceptTerms]').check()
    await page.locator('#register-confirmPassword').fill('Different!72CobaltRiver')
    await page.locator('#register-confirmPassword').press('Enter')
    await page.locator('#register-confirmPassword-error').waitFor()
    assert.equal(await page.locator('#register-confirmPassword').getAttribute('aria-invalid'), 'true')
    await page.locator('#register-confirmPassword').fill('Harbor!72CobaltRiver')
    checks.push('Mismatched passwords block signup with an associated confirmation error')
    let payload, signupRequests = 0, finishSignup
    const signupGate = new Promise(resolve => { finishSignup = resolve })
    // Stub only the signup response. No test signup writes or external mail.
    await page.route('**/api/auth/register', async route => {
      payload = route.request().postDataJSON()
      signupRequests++
      await signupGate
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ requiresVerification: true, email: payload.email, expiresMinutes: 30, delivery: 'Local preview: no verification email was sent.' }) })
    })
    const signupRequested = page.waitForRequest(request => request.url() === base + '/api/auth/register')
    await page.getByRole('button', { name: 'Create preview account', exact: true }).click()
    await signupRequested
    assert.equal(await page.locator('form.auth-form fieldset').evaluate(node => node.disabled), true)
    await page.keyboard.press('Enter'); await page.keyboard.press('Enter')
    assert.equal(signupRequests, 1)
    finishSignup()
    await page.getByRole('heading', { name: 'Your preview account is created.', exact: true }).waitFor()
    assert.equal(payload.firstName, 'Preview')
    assert.equal(payload.phoneCountry, 'PK')
    assert.equal(payload.acceptTerms, true)
    assert.ok(payload.humanToken && payload.humanAnswer)
    assert.equal(payload.role, undefined)
    assert.ok(await page.getByText('No verification email was sent.', { exact: false }).count())
    checks.push('Signup submits required data and human check; pending preview state honestly explains no email (stubbed API)')
    checks.push('Busy signup disables controls and prevents repeated submissions')

    await page.setViewportSize({ width: 390, height: 844 })
    await visit('/login'); await capture('login-mobile'); await fit('Mobile login')
    assert.equal(await page.getByRole('button', { name: 'Open PYPC AI Assistant', exact: true }).count(), 0)
    await visit('/register'); await capture('signup-mobile'); await fit('Mobile signup')
    assert.equal(await page.getByRole('button', { name: 'Open PYPC AI Assistant', exact: true }).count(), 0)
    checks.push('Floating assistant stays out of mobile account forms')
    await page.setViewportSize({ width: 320, height: 760 }); await fit('Narrow mobile signup')
    await page.setViewportSize({ width: 1440, height: 1050 })
    await visit('/about')
    const photos = page.locator('#about-highlights-heading').locator('..').locator('..').locator('img')
    assert.equal(await photos.count(), 2)
    await photos.first().scrollIntoViewIfNeeded()
    await page.waitForFunction(() => [...document.querySelectorAll('section[aria-labelledby="about-highlights-heading"] img')].every(img => img.complete && img.naturalWidth > 0))
    const imageFits = await photos.evaluateAll(images => images.map(img => getComputedStyle(img).objectFit))
    assert.deepEqual(imageFits, ['contain', 'contain'])
    const text = await page.locator('section[aria-labelledby="about-highlights-heading"]').innerText()
    assert.ok(text.includes('Madam Wajiha Qamar'))
    assert.ok(text.includes('Alhamdulillah — Dr. Mohsin Ejaz'))
    assert.ok(text.includes('Ms. Aniqa Hassan'))
    await capture('about-photos-desktop', 'section[aria-labelledby="about-highlights-heading"]')
    checks.push('Both About photographs load fully with their supplied captions and contain fit')
    const expectedCaptions = [
      'A highly productive meeting with Madam Wajiha Qamar, Minister of State for Federal Education & Professional Training, Government of Pakistan.',
      'A truly gracious and inspiring personality, Madam extended her full institutional support and cooperation for our initiatives, including IMUN 2027, and assured us of her continued guidance and facilitation whenever needed.',
      'Grateful for her time, encouragement and confidence in the vision of Pakistan Youth Parliamentary Council (PYPC). 🇵🇰',
      'Alhamdulillah — Dr. Mohsin Ejaz, Founder & Chairman, Pakistan Youth Parliamentary Council (PYPC), honoured with a Shield of Honour from the Senate of Pakistan, presented by the Acting Chairman Senate, Sardar Syedal Khan Nasir.',
      'Alongside him was Ms. Aniqa Hassan, Vice President, Pakistan Youth Parliamentary Council (PYPC).',
      'A proud moment of recognition, gratitude, and commitment to serving youth and Pakistan. 🇵🇰'
    ]
    assert.deepEqual(await page.locator('section[aria-labelledby="about-highlights-heading"] figcaption p').allTextContents(), expectedCaptions)
    const hash = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
    assert.equal(hash('public/images/ec4679a1-4451-4c6c-add5-d145ebe90f04.jpg'), hash('public/images/editorial/about-institutional-support.jpg'))
    assert.equal(hash('public/images/c611ac11-baa9-494a-a89d-6a5d7fa17e21.jpg'), hash('public/images/editorial/about-senate-recognition.jpg'))
    checks.push('All six caption paragraphs match owner copy exactly; both photo files are byte-identical to supplied originals')
    await page.setViewportSize({ width: 390, height: 844 })
    await capture('about-photos-mobile', 'section[aria-labelledby="about-highlights-heading"]')
    await fit('Mobile About photos')

    await visit('/login')
    await page.evaluate(() => document.documentElement.classList.add('dark'))
    await capture('login-dark-mobile')
    await fit('Dark mobile login')
    await contrast('Dark login')

    await visit('/login')
    await page.locator('#login-email').fill(access.email)
    await page.locator('#login-password').fill(access.password)
    const realLogin = page.waitForResponse(response => response.url() === base + '/api/auth/login' && response.request().method() === 'POST')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    assert.equal((await realLogin).status(), 200, 'Synthetic login must succeed before dashboard navigation')
    await page.waitForURL(url => url.pathname === '/admin', { waitUntil: 'domcontentloaded', timeout: 60000 })
    checks.push('Real synthetic preview login still reaches the authorized admin dashboard')
    const logoutStatus = await page.evaluate(async () => (await fetch('/api/auth/logout', { method: 'POST' })).status)
    assert.equal(logoutStatus, 200)
    const deniedStatus = await page.evaluate(async () => (await fetch('/api/admin/roles')).status)
    assert.equal(deniedStatus, 401)
    checks.push('Synthetic fixture logout revokes dashboard API access')
    const accountAfter = await db.user.findUnique({ where: { email: 'tahamazhar01@gmail.com' }, select: accountFields })
    assert.deepEqual(accountAfter, accountBefore)
    checks.push('Approved user remains ACTIVE, verified and SUPER_ADMIN; no account data, password, or sessions modified by UI checks')
    assert.deepEqual(errors, [], 'Unexpected browser runtime errors')
    const result = { checks, screenshots, browser: 'Microsoft Edge', browserVersion: browser.version(), existingPreviewPreserved: true, signupApiStubbed: true, completedAt: new Date().toISOString() }
    fs.writeFileSync(path.join(output, 'result.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify({ passed: checks.length, screenshots, browser: result.browser, existingPreviewPreserved: true }, null, 2))
  } finally { await browser.close(); await db.$disconnect() }
}
// Playwright navigation diagnostics can include URL query values. Never print
// complete errors from credential-bearing flows; identify only the safe stage.
main().catch(error => { const line = error.stack?.split('\n').find(line => /check-auth-ui\.cjs:\d+:\d+/.test(line)); console.error('UI check failed at ' + testStage + ': ' + error.name + (line ? '\n' + line.trim() : '')); process.exitCode=1 })
