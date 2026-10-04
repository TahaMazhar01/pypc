#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# PYPC platform — one-command setup and start (macOS / Linux)
#
#   ./setup.sh            install, prepare the database, build, start
#   ./setup.sh --dev      same, but start the dev server with hot reload
#   ./setup.sh --skip-build   reuse an existing .next build
#
# The seeded database (prisma/dev.db) ships inside this folder, so the site has
# members, plans, programmes, events and certificates the moment it starts.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"

MODE="start"
SKIP_BUILD="no"
for arg in "$@"; do
  case "$arg" in
    --dev) MODE="dev" ;;
    --skip-build) SKIP_BUILD="yes" ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

step "Checking Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node 20 or newer from https://nodejs.org and run this again."
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
echo "Node $(node -v) detected"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node 20 or newer is required (Next.js 14 + Prisma 5). Please upgrade."
  exit 1
fi

step "Installing dependencies (needs internet for this step only)"
npm install --no-audit --no-fund

step "Preparing the database"
if [ -f prisma/dev.db ]; then
  echo "prisma/dev.db is already present — pushing any schema changes."
else
  echo "prisma/dev.db was missing — creating a fresh database."
fi
npm run db:generate
npm run db:push -- --skip-generate

step "Seeding demo accounts and content (safe to repeat)"
npm run db:seed

if [ "$SKIP_BUILD" = "no" ]; then
  step "Building the production bundle"
  npm run build
fi

if [ "$MODE" = "dev" ]; then
  step "Starting the development server — http://localhost:3000"
  exec npm run dev
else
  step "Starting the site — http://localhost:3000"
  echo "Open http://localhost:3000   ·   staff sign-in: admin@pypc.org.pk / Pypc@2026"
  echo "Press Ctrl+C to stop."
  exec npm start
fi
