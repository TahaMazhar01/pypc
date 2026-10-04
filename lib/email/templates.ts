import { CONTACT_EMAIL, SITE_NAME } from '@/lib/constants'

/**
 * Transactional email content. Plain text is the primary body (it always
 * renders), with a simple HTML alternative for mail clients that want it.
 */

function shell(title: string, paragraphs: string[], cta?: { href: string; label: string }, footer?: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title></head>
<body style="margin:0;padding:24px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#17201d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8e5;border-radius:14px">
    <tr><td style="padding:24px 26px 8px">
      <p style="margin:0;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#856919;font-weight:bold">${SITE_NAME}</p>
      <h1 style="margin:8px 0 0;font-size:21px;line-height:1.3;color:#06261e">${title}</h1>
    </td></tr>
    <tr><td style="padding:8px 26px 0">
      ${paragraphs.map(text => `<p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#3c4a45">${text}</p>`).join('')}
    </td></tr>
    ${
      cta
        ? `<tr><td style="padding:22px 26px 4px">
             <a href="${cta.href}" style="display:inline-block;background:#0f4c3a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:13px 22px;border-radius:9px">${cta.label}</a>
             <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6b7a74;word-break:break-all">Or paste this link into your browser:<br />${cta.href}</p>
           </td></tr>`
        : ''
    }
    <tr><td style="padding:20px 26px 26px">
      <hr style="border:none;border-top:1px solid #edf1ef;margin:0 0 14px" />
      <p style="margin:0;font-size:12px;line-height:1.7;color:#8a9691">${footer ?? 'If you did not request this message you can ignore it safely.'}</p>
    </td></tr>
  </table>
</body></html>`
}

export function verificationEmail(input: {
  firstName: string
  email: string
  code: string
  link: string
  expiresMinutes: number
}) {
  const subject = `Verify your email to activate your ${SITE_NAME} account (code ${input.code})`

  const text = `Assalam-o-Alaikum ${input.firstName},

Use the code below to verify that this email address belongs to you. Your ${SITE_NAME} account stays locked until verification is complete.

    Verification code: ${input.code}

Or open this link to verify automatically:
${input.link}

This code and link expire in ${input.expiresMinutes} minutes. If you did not create a PYPC account, no action is needed — the account will never be activated.

${SITE_NAME}
Islamabad, Pakistan`

  const html = shell(
    'Confirm your email address',
    [
      `Assalam-o-Alaikum ${input.firstName},`,
      `Enter this code to activate your account. It expires in ${input.expiresMinutes} minutes.`,
      `<span style="display:inline-block;font-family:'Courier New',monospace;font-size:26px;letter-spacing:8px;font-weight:bold;color:#0f4c3a;background:#eef8f4;border:1px solid #d8f0e7;border-radius:10px;padding:12px 18px">${input.code}</span>`
    ],
    { href: input.link, label: 'Verify my email address' },
    `You are receiving this because someone registered this address with ${SITE_NAME}. If that was not you, ignore this email — the account cannot be activated without this code.`
  )

  return { subject, text, html }
}

export function verificationResentEmail(input: {
  firstName: string
  code: string
  link: string
  expiresMinutes: number
}) {
  const base = verificationEmail({ ...input, email: '', firstName: input.firstName })
  return { ...base, subject: `Your new PYPC verification code: ${input.code}` }
}

export function passwordChangedEmail(input: { firstName: string; ip: string; at: string }) {
  const source = { firstName: input.firstName, email: '', code: '—', link: '', expiresMinutes: 0 }
  void source

  const text = `Assalam-o-Alaikum ${input.firstName},

Your ${SITE_NAME} account password was changed on ${input.at} from IP ${input.ip}.

If this was you, no action is needed. If it was not, reset your password immediately and contact ${CONTACT_EMAIL}.

${SITE_NAME}`

  const html = shell('Your password was changed', [
    `Assalam-o-Alaikum ${input.firstName},`,
    `Your password was changed on <strong>${input.at}</strong> from IP <strong>${input.ip}</strong>.`,
    `If this was not you, reset your password immediately and contact the secretariat at ${CONTACT_EMAIL}.`
  ])

  return { subject: `Security notice: PYPC password changed`, text, html }
}

export function loginFromNewDeviceEmail(input: { firstName: string; ip: string; at: string }) {
  const text = `Assalam-o-Alaikum ${input.firstName},

A new sign-in to your ${SITE_NAME} account was recorded on ${input.at} from IP ${input.ip}.

If this was you, no action is needed. If it was not, change your password now.

${SITE_NAME}`

  const html = shell('New sign-in to your account', [
    `Assalam-o-Alaikum ${input.firstName},`,
    `We recorded a sign-in on <strong>${input.at}</strong> from IP <strong>${input.ip}</strong>.`,
    'If this was not you, change your password immediately.'
  ])

  return { subject: 'Security notice: new PYPC sign-in', text, html }
}

export function invitationLetterStatusEmail(input: {
  firstName: string
  reference: string
  status: string
  note?: string | null
}) {
  const text = `Assalam-o-Alaikum ${input.firstName},

Your visa invitation letter request ${input.reference} is now: ${input.status.replace(/_/g, ' ').toLowerCase()}.
${input.note ? `\nNote from the secretariat: ${input.note}\n` : ''}
Track the request any time from your dashboard.

${SITE_NAME}`

  const html = shell('Visa invitation letter update', [
    `Assalam-o-Alaikum ${input.firstName},`,
    `Request <strong>${input.reference}</strong> is now <strong>${input.status.replace(/_/g, ' ').toLowerCase()}</strong>.`,
    input.note ? `Note from the secretariat: ${input.note}` : ''
  ].filter(Boolean), {
    href: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard/visa-letters`,
    label: 'Open my requests'
  })

  return { subject: `Visa invitation letter ${input.reference}: update`, text, html }
}
