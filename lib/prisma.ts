import { PrismaClient } from '@prisma/client'
import path from 'node:path'

if (process.env.UI_PREVIEW_ONLY === 'true') {
  process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'prisma', 'preview.db')}`
}

/**
 * Prisma singleton — prevents connection exhaustion during Next.js
 * hot-reload in development.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
