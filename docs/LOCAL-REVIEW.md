# Local project review

Reviewed on 4 October 2026 on Windows with Node.js 24.21.0 and npm 11.19.0.

## Stack and structure

This is a full-stack Next.js 14.2.35 application using the App Router, React 18,
TypeScript, Tailwind CSS 3, Framer Motion, Three.js and Lucide icons. Next.js
server components and API route handlers provide the backend in the same project.
Prisma 5.22 connects to the bundled SQLite database at `prisma/dev.db`.
PostgreSQL is a documented deployment option, not the configured database.

- `app/`: public pages, member dashboard, staff administration and API routes.
- `components/`: forms, layout, reusable controls, animations and 3D scenes.
- `lib/`: authentication, validation, payments, email, AI, certificates and auditing.
- `prisma/`: 22 database models, seed script and the populated local database.
- `public/`: branding, images, institutional documents and public reports.
- `private/`: private uploads and generated certificate storage.
- `scripts/`: setup support and automated checks.

The main features are membership plans and payments, programmes, events,
opportunities and applications, QR-verifiable certificates, international visa
letter requests, partnership requests, a multilingual assistant, member accounts
and staff administration. Authentication uses JWT cookies through jose, bcrypt
password hashes, email verification, role checks and optional TOTP two-factor
authentication. Forms use React Hook Form and Zod. Email uses Nodemailer;
certificate generation uses pdf-lib and qrcode. Payment adapters cover Stripe,
JazzCash and Easypaisa. The assistant supports OpenAI with a local knowledge-base
fallback.

## Work completed

- Installed the locked npm dependencies and generated the Prisma client.
- Added the missing `check:connectivity` npm script already referenced throughout
  the documentation and implemented by `scripts/check-connectivity.js`.
- Built the production application and started it on the loopback interface,
  port 3000. The existing seeded database was preserved without resetting or
  reseeding it.

## Verification

- Production build passed, including its lint and TypeScript checks.
- Public/protected route smoke checks: 46 passed.
- Health checks: 12 passed; database, storage and bundled assets are healthy.
- Responsive source and rendered-CSS checks: 63 passed.
- Authentication/authorisation matrix: 18 passed.
- All 50 unique internal targets linked from the homepage returned no HTTP errors.
- The existing colour-palette check passed all 49 configured pairs. This is a
  project-specific check, not a complete accessibility certification.
- The existing secret-pattern scanner passed.
- The homepage rendered in the browser, with no captured console errors.

These checks do not establish that every workflow is defect-free. Live merchant
transactions, external email delivery and OpenAI-backed responses were not
verified. Registration, uploads and payment end-to-end mutation suites were not
run against the bundled database. Responsive checks primarily examine source
and CSS; they are not a full device/browser matrix.

## Running locally

Open http://localhost:3000. The current server uses the production build.

To start it again from this directory:

```powershell
npm start -- --hostname 127.0.0.1
```

For development, stop the existing server first, then run:

```powershell
npm run dev -- --hostname 127.0.0.1
```

After source changes, rebuild before using `npm start`:

```powershell
npm run build
npm start -- --hostname 127.0.0.1
```

The health page intentionally warns about missing SMTP and payment credentials.
Email currently uses the local outbox. Payment simulation is available only
under `npm run dev`; it is disabled by the application in production mode.
See `START-HERE.md` for bundled demo accounts. Replace demo credentials and
development secrets before a public deployment.

## Maintenance observations

The installation emitted dependency deprecation warnings, including ESLint 8.
No dependency upgrade or vulnerability audit was performed in this setup pass.
Some existing documentation describes older feature/check totals and refers to
`JWT_SECRET`, while the implemented session configuration uses `AUTH_SECRET`.
Treat source code and current command output as authoritative. This folder has
no Git repository metadata, so the work was not committed.
