# Official contact channels

These are the organisation's live channels. They are defined **once** in
`lib/constants.ts` and rendered everywhere: the footer on every page, the contact
page, the AI assistant, the policy documents, the contact-form confirmations and
the outgoing emails (`From:` and reply-to). Change a value there — or override it
in `.env` — and the whole platform follows with no page edits.

| Channel | Value | Where it appears |
| ---

## Social accounts

| Channel | Address | Handle |
| --- | --- | --- |
| LinkedIn | https://www.linkedin.com/company/pakistan-youth-parliamentary-council | company page |
| Instagram | https://www.instagram.com/pypcofficial/ | `@pypcofficial` |
| Facebook | https://www.facebook.com/pypcofficial | `@pypcofficial` |
| YouTube | https://www.youtube.com/@pypcofficial | `@pypcofficial` |

The rule the platform follows: **a channel is published only if its real address
is known.** All four are compiled into `lib/social.ts` as supplied and confirmed
by the secretariat — one handle, `pypcofficial`, everywhere — and each can be
moved per deployment with `NEXT_PUBLIC_SOCIAL_*`.

If a channel page is ever taken down, set
`NEXT_PUBLIC_SOCIAL_<CHANNEL>_PENDING="true"`: that channel then renders as a
labelled chip (mark, name and handle, no outbound link) across the whole site at
once, so visitors are never sent to an error page.

--- | --- | --- |
| LinkedIn | https://www.linkedin.com/company/pakistan-youth-parliamentary-council | link (resolves) |
| Instagram | https://www.instagram.com/pypcofficial/ | link — `@pypcofficial` |
| Facebook | https://www.facebook.com/pypcofficial | link — `@pypcofficial` |
| YouTube | https://www.youtube.com/pypcofficial | information chip — this address returns 404 today |

The rule the platform follows: **a channel is published only if its real address
is known, and it is only *linked* if that address resolves.** All four pages are
compiled into `lib/social.ts` as supplied, and each can be moved per deployment
with `NEXT_PUBLIC_SOCIAL_*`.

YouTube currently answers *404 — page isn't available* in both the legacy and the
`@handle` form, so its mark, name and handle are shown with a "Soon" note and no
outbound link; a click that lands on an error page is a worse outcome than an
honest label. When the channel is published, set `NEXT_PUBLIC_SOCIAL_YOUTUBE` (or
flip `YOUTUBE_PENDING` in `lib/social.ts`) and it becomes a link everywhere.

--- | --- | --- |
| **Phone / WhatsApp** | **+92 315 5729598** | Footer (tap-to-call), contact page, `wa.me` WhatsApp link, mobile sticky actions |
| **Primary email** | **pypcofficial@gmail.com** | Footer, contact page, contact-form success and error messages, transactional email sender, `EMAIL_FROM` default |
| **Secondary email** | **officialpypc@gmail.com** | Footer, contact page, verification notices, policy correspondence |
| **Office hours** | Monday–Saturday, 10:00–18:00 PKT (GMT+5) | Footer and contact page, with a note that every country is served and replies are sent in the sender's time zone |
| **Address** | Islamabad, Pakistan | Footer, contact page, policies, email signatures |

## Overriding per deployment

`.env` (the file shipped is a working development configuration):

```ini
NEXT_PUBLIC_CONTACT_EMAIL_1="pypcofficial@gmail.com"
NEXT_PUBLIC_CONTACT_EMAIL_2="officialpypc@gmail.com"
NEXT_PUBLIC_CONTACT_PHONE="+92 315 5729598"
EMAIL_FROM="PYPC Secretariat <pypcofficial@gmail.com>"
```

`CONTACT_PHONE_E164` and the WhatsApp link are derived from `CONTACT_PHONE`
automatically — spaces and symbols are stripped, so `+92 315 5729598` becomes
`tel:+923155729598` and `https://wa.me/923155729598`.

## Email deliverability

The default sender is the secretariat's real mailbox because relays (including
Gmail SMTP, which the secretariat can use without buying a domain) reject or
spam-flag mail whose `From:` does not match the authenticated account. When a
custom domain is available, set `EMAIL_FROM="PYPC Secretariat <no-reply@yourdomain>"`,
add SPF, DKIM and DMARC records for it, and the templates need no changes.

Verification codes are always delivered: with SMTP configured they are emailed,
and in development they are also written to the outbox and shown on screen, so
nobody can be locked out by a mail configuration problem.

## Where a message goes

| Form | Stored in | Visible to staff at |
| --- | --- | --- |
| Public contact form | `ContactMessage` | `/admin/messages` |
| Member support request | `SupportRequest` | `/admin` → support queue |
| Visa-letter request | `VisaLetterRequest` | `/admin/visa-letters` |
| Membership order | `Order` + `Membership` | `/admin/payments`, `/admin/users` |

Every submission is also written to the audit log with the IP and timestamp, so
correspondence can be traced back even if an email bounces.
