const assert = require('node:assert/strict')
const sharp = require('sharp')

/** Runs only inside the fresh-database security harness. */
module.exports = async function ({ db, request, accounts, check }) {
  const member = accounts.MEMBER
  const values = {
    programme: { slug: 'crud-programme', title: 'Synthetic programme', category: 'Leadership', summary: 'Synthetic programme summary.', description: 'A complete synthetic programme description.', objectives: '[]', outcomes: '[]', structure: '[]', mode: 'Online', durationWeeks: 2, seats: 20, feePkr: 0, feeUsd: 0, isFeatured: false, sortOrder: 0, startsAt: null, endsAt: null },
    opportunity: { slug: 'crud-position', title: 'Synthetic research position', organisation: 'Synthetic Council', type: 'Job', location: 'Pakistan', mode: 'Remote', deadline: null, stipend: null, summary: 'A synthetic research position.', description: 'A complete synthetic job description.', requirements: '["Research experience"]', applyUrl: null, isFeatured: false },
    homepage: { section: 'card', title: 'Synthetic homepage card', summary: 'A synthetic card for lifecycle checks.', image: '/images/editorial/diplomacy.webp', imageAlt: 'Synthetic bundled illustration', href: '/about', cta: 'Read more', sortOrder: 90, fullName: '', location: '', date: '', scale: '', category: 'Conference', status: '', featured: false }
  }
  const current = async (entity, id) => (await request('/api/admin/content?entity=' + entity, 'ADMIN')).body.items.find(item => item.id === id)
  for (const [entity, data] of Object.entries(values)) {
    await check(entity + ' complete draft/edit/publish/archive/restore lifecycle', async () => {
      const created = await request('/api/admin/content', 'ADMIN', 'POST', { entity, version: 0, data }); assert.equal(created.status, 201)
      const id = created.body.id
      let item = await current(entity, id)
      assert.equal((await request('/api/admin/content','ADMIN','POST',{ entity, id, version: item.version, data: { ...data, title: data.title + ' revised' } })).status, 200)
      item = await current(entity, id)
      assert.equal((await request('/api/admin/content','ADMIN','PATCH',{ entity, id, version: item.version, action: 'publish' })).status, 200)
      item = await current(entity, id); assert.equal(item.published, true)
      assert.equal((await request('/api/admin/content','ADMIN','PATCH',{ entity, id, version: item.version, action: 'unpublish' })).status, 200)
      item = await current(entity, id); assert.equal(item.published, false); assert.equal(item.retained, true)
      assert.equal((await request('/api/admin/content','MEMBER','PATCH',{ entity, id, version: item.version, action: 'restore' })).status, 403)
      assert.equal((await request('/api/admin/content','ADMIN','PATCH',{ entity, id, version: item.version, action: 'restore' })).status, 200)
      assert.equal((await current(entity, id)).published, true)
    })
  }
  await check('restore keeps pending event draft private and registrations intact', async () => {
    const event = await db.event.findFirst({ where: { slug: 'synthetic-test-event' } })
    const item = await current('event', event.id)
    assert.equal((await request('/api/admin/content','ADMIN','PATCH',{ entity: 'event', id: event.id, version: item.version, action: 'restore' })).status, 200)
    assert.equal((await db.event.findUnique({ where: { id: event.id } })).title, 'Synthetic event')
    assert.equal((await current('event', event.id)).values.title, 'Private changed title')
    assert.equal(await db.eventRegistration.count({ where: { eventId: event.id } }), 1)
  })
  await check('delete unused draft removes only the draft', async () => {
    const created = await request('/api/admin/content','ADMIN','POST',{ entity: 'opportunity', version: 0, data: { ...values.opportunity, slug: 'unused-position' } })
    assert.equal((await request('/api/admin/content','ADMIN','PATCH',{ entity: 'opportunity', id: created.body.id, version: created.body.version, action: 'discard' })).status, 200)
    assert.equal(await db.contentDraft.count({ where: { targetId: created.body.id } }), 0)
    assert.equal(await db.opportunity.count({ where: { id: created.body.id } }), 0)
  })
  await check('custom role edit/delete works and built-in roles remain protected', async () => {
    const created = await request('/api/admin/roles','ADMIN','POST',{ name: 'Synthetic temporary reviewer', permissions: ['dashboard.read'] }); assert.equal(created.status, 201)
    const role = created.body.role
    const edited = await request('/api/admin/roles','ADMIN','PATCH',{ id: role.id, version: role.version, name: 'Synthetic renamed reviewer', permissions: ['dashboard.read','messages.read','messages.manage'] }); assert.equal(edited.status, 200)
    assert.equal((await request('/api/admin/roles','ADMIN','DELETE',{ id: role.id, version: edited.body.role.version })).status, 200)
    assert.equal((await request('/api/admin/roles','ADMIN','DELETE',{ id: 'SUPER_ADMIN', version: 1 })).status, 409)
  })
  const profile = { firstName: 'Synthetic', lastName: 'Updated member', city: 'Islamabad', province: 'ICT', institution: 'Synthetic University', profession: 'Researcher' }
  await check('member profile edit preserves password, identity, role and sessions', async () => {
    const before = await db.user.findUnique({ where: { id: member.id } })
    assert.equal((await request('/api/admin/users','MEMBER','PATCH',{ userId: member.id, profile })).status, 403)
    assert.equal((await request('/api/admin/users','ADMIN','PATCH',{ userId: member.id, profile })).status, 200)
    const after = await db.user.findUnique({ where: { id: member.id } })
    for (const key of ['passwordHash','email','role','sessionVersion']) assert.equal(after[key], before[key])
    assert.equal(after.lastName, profile.lastName)
    assert.equal((await request('/api/admin/users','ADMIN','PATCH',{ userId: member.id, profile: { ...profile, email: 'changed@example.invalid' } })).status, 422)
  })
  const png = await sharp({ create: { width: 32, height: 20, channels: 3, background: '#547556' } }).png().toBuffer()
  await check('media descriptions edit safely; stale edits and unauthorized changes denied; unused delete succeeds', async () => {
    const created = await request('/api/admin/media','ADMIN','POST',png,{ 'Content-Type': 'image/png', 'x-image-alt': 'Synthetic metadata image' }); assert.equal(created.status, 201)
    const id = created.body.media.id
    const data = { id, alt: 'Updated synthetic image', expectedAlt: 'Synthetic metadata image' }
    assert.equal((await request('/api/admin/media','MEMBER','PATCH',data)).status, 403)
    assert.equal((await request('/api/admin/media','ADMIN','PATCH',data)).status, 200)
    assert.equal((await request('/api/admin/media','ADMIN','PATCH',data)).status, 409)
    assert.equal((await request('/api/admin/media','ADMIN','PATCH',{ ...data, expectedAlt: data.alt, path: '../../other' })).status, 422)
    assert.equal((await request('/api/admin/media','ADMIN','DELETE',{ id })).status, 200)
  })
  const application = await db.application.create({ data: { reference: 'SYN-APP-CRUD', userId: member.id, type: 'PROGRAMME', fullName: 'Synthetic Applicant', email: member.email, phone: '+923001234567', motivation: 'Synthetic motivation for isolated checks.' } })
  const partnership = await db.partnershipRequest.create({ data: { reference: 'SYN-MOU-CRUD', institutionName: 'Synthetic University', institutionType: 'UNIVERSITY', contactName: 'Synthetic Partner', contactRole: 'Coordinator', contactEmail: 'partner@example.invalid', interests: '[]', message: 'Synthetic request for isolated checks.' } })
  const visa = await db.visaLetterRequest.create({ data: { reference: 'SYN-VISA-CRUD', userId: member.id, fullName: 'Synthetic Delegate', email: member.email, nationality: 'Pakistan', letterType: 'CONFERENCE_INVITATION', purpose: 'Synthetic conference participation.' } })
  const message = await db.contactMessage.create({ data: { name: 'Synthetic Sender', email: 'sender@example.invalid', subject: 'Synthetic message ' + 'LongTitle'.repeat(15), message: 'LongContent'.repeat(90) } })
  for (const [endpoint, idField, record, reopen] of [['applications','applicationId',application,'PENDING'],['partnerships','requestId',partnership,'SUBMITTED'],['visa-letters','requestId',visa,'PENDING'],['messages','id',message,'NEW']]) {
    await check(endpoint + ' update/archive/reopen allowed only by permission and unknown fields rejected', async () => {
      const data = { [idField]: record.id, status: 'ARCHIVED', ...(endpoint !== 'messages' ? { adminNotes: 'Synthetic review note.' } : {}) }
      assert.equal((await request('/api/admin/' + endpoint,'MEMBER','PATCH',data)).status, 403)
      assert.equal((await request('/api/admin/' + endpoint,'ADMIN','PATCH',{ ...data, role: 'SUPER_ADMIN' })).status, 422)
      assert.equal((await request('/api/admin/' + endpoint,'ADMIN','PATCH',data)).status, 200)
      assert.equal((await request('/api/admin/' + endpoint,'ADMIN','PATCH',{ ...data, status: reopen, ...(endpoint !== 'messages' ? { adminNotes: '' } : {}) })).status, 200)
      assert.equal((await request('/api/admin/' + endpoint,'ADMIN','PATCH',{ ...data, [idField]: 'missing-record' })).status, 404)
    })
  }
  await check('certificate issue/correct/revoke/reinstate retains protected verification record', async () => {
    const data = { title: 'Synthetic achievement', recipientName: 'Synthetic Member', description: 'For participation in the synthetic test programme.', userId: member.id }
    const created = await request('/api/certificates','ADMIN','POST',data); assert.equal(created.status, 201)
    const certificateId = created.body.certificate.id
    const patch = { certificateId, action: 'UPDATE', details: { title: data.title + ' corrected', recipientName: data.recipientName, description: data.description, grade: 'Completed' } }
    assert.equal((await request('/api/admin/certificates','MEMBER','PATCH',patch)).status, 403)
    assert.equal((await request('/api/admin/certificates','ADMIN','PATCH',patch)).status, 200)
    for (const action of ['REVOKE','REINSTATE']) assert.equal((await request('/api/admin/certificates','ADMIN','PATCH',{ certificateId, action, reason: 'Synthetic lifecycle check' })).status, 200)
    assert.equal((await request('/api/admin/certificates','SUPER_ADMIN','PATCH',{ certificateId, action: 'DELETE' })).status, 409)
    assert.equal(await db.certificate.count({ where: { id: certificateId } }), 1)
  })
  const plan = await db.membershipPlan.create({ data: { code: 'SYN-CRUD', name: 'Synthetic plan', tier: 'TEST', tagline: 'Synthetic', description: 'Synthetic plan only.', pricePkr: 100, priceUsd: 1, durationMonths: 1, features: '[]', benefits: '[]' } })
  const order = await db.order.create({ data: { reference: 'SYN-ORDER-CRUD', userId: member.id, planId: plan.id, provider: 'BANK_TRANSFER', currency: 'PKR', amountMinor: 10000 } })
  await check('manual reconciliation validates evidence, enforces permission and prevents duplicate settlement', async () => {
    const body = { reference: order.reference, decision: 'APPROVE', evidence: 'SYN-RECEIPT-ONLY' }
    assert.equal((await request('/api/payments/manual-settlement','MEMBER','POST',body)).status, 403)
    assert.equal((await request('/api/payments/manual-settlement','ADMIN','POST',{ ...body, evidence: '' })).status, 400)
    const responses = await Promise.all([request('/api/payments/manual-settlement','ADMIN','POST',body),request('/api/payments/manual-settlement','ADMIN','POST',body)])
    assert.deepEqual(responses.map(item => item.status).sort(), [200,409])
    assert.equal(await db.membership.count({ where: { orderId: order.id } }), 1)
    assert.equal((await request('/api/payments/manual-settlement','ADMIN','POST',{ ...body, decision: 'REJECT' })).status, 409)
  })
  await db.order.create({ data: { reference: 'SYN-ORDER-PENDING', userId: member.id, planId: plan.id, provider: 'BANK_TRANSFER', currency: 'PKR', amountMinor: 20000 } })
  await check('expanded CRUD mutations have durable audit entries', async () => {
    for (const action of ['CONTENT_RESTORE','ROLE_DELETED','MEDIA_DESCRIPTION_UPDATED','MEDIA_DELETED','APPLICATION_STATUS_UPDATED','PARTNERSHIP_STATUS_CHANGED','VISA_LETTER_STATUS_UPDATED','MESSAGE_STATUS_UPDATED','CERTIFICATE_UPDATED','CERTIFICATE_ISSUED','CERTIFICATE_REVOKED','CERTIFICATE_REINSTATED','ORDER_SETTLED_MANUALLY']) assert.ok(await db.auditLog.count({ where: { action } }), action)
  })
}
