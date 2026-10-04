import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { get, put } from '@vercel/blob'

export function cloudUploadsConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

/**
 * Private document storage.
 *
 * Resumes and visa-supporting documents are personal data, so they are written
 * to `private/uploads` — a directory that is NOT inside `public/` and therefore
 * cannot be fetched by URL — and served back through an authenticated route.
 * Files are named `<ownerId>-<uuid>.<ext>` so ownership can be checked from the
 * filename alone.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export const ALLOWED_UPLOAD_TYPES: Record<string, { ext: string; label: string; magic: number[][] }> = {
  'application/pdf': {
    ext: 'pdf',
    label: 'PDF',
    // %PDF
    magic: [[0x25, 0x50, 0x44, 0x46]]
  },
  'application/msword': {
    ext: 'doc',
    label: 'Word (legacy)',
    // OLE2 compound file
    magic: [[0xd0, 0xcf, 0x11, 0xe0]]
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: 'docx',
    label: 'Word',
    // PK zip container
    magic: [[0x50, 0x4b, 0x03, 0x04]]
  }
}

export const UPLOAD_ACCEPT = Object.keys(ALLOWED_UPLOAD_TYPES).join(',')

export const UPLOAD_HINT = `PDF or Word document, maximum ${Math.round(
  MAX_UPLOAD_BYTES / (1024 * 1024)
)} MB.`

function uploadDir() {
  return path.join(process.cwd(), 'private', 'uploads', 'resumes')
}

function hasValidMagic(buffer: Buffer, magicSets: number[][]) {
  return magicSets.some(sequence => sequence.every((byte, index) => buffer[index] === byte))
}

export type StoredDocument = {
  storedName: string
  url: string
  originalName: string
  size: number
  mime: string
}

/**
 * Validates and stores an uploaded document for a given owner.
 * Throws an Error with a human-readable message when the file is rejected.
 */
export async function storeDocument(file: File, ownerId: string): Promise<StoredDocument> {
  const type = ALLOWED_UPLOAD_TYPES[file.type]

  if (!type) {
    const byExtension = Object.values(ALLOWED_UPLOAD_TYPES).find(item =>
      file.name.toLowerCase().endsWith(`.${item.ext}`)
    )
    if (!byExtension) {
      throw new Error(
        `Unsupported file type. Allowed formats: ${Object.values(ALLOWED_UPLOAD_TYPES)
          .map(item => item.label)
          .join(', ')}.`
      )
    }
  }

  const resolvedType =
    type ??
    Object.values(ALLOWED_UPLOAD_TYPES).find(item => file.name.toLowerCase().endsWith(`.${item.ext}`))!

  if (file.size <= 0) throw new Error('The uploaded file is empty.')
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`File is too large. Maximum size is ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`)
  }

  const bytes = Buffer.from(await file.arrayBuffer())

  if (!hasValidMagic(bytes, resolvedType.magic)) {
    throw new Error(
      `The file does not look like a real ${resolvedType.label} document. Please upload a valid file.`
    )
  }

  const safeOwner = ownerId.replace(/[^a-zA-Z0-9_-]/g, '')
  const storedName = `${safeOwner}-${randomUUID()}.${resolvedType.ext}`
  const directory = uploadDir()

  if (cloudUploadsConfigured()) {
    await put('resumes/' + storedName, bytes, {
      access: 'private', addRandomSuffix: false,
      contentType: contentTypeFor(storedName)
    })
  } else {
    if (process.env.VERCEL) throw new Error('Private document storage is not configured. Please contact support.')
    await mkdir(directory, { recursive: true })
    await writeFile(path.join(directory, storedName), bytes)
  }

  const originalName = file.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || `document.${resolvedType.ext}`

  return {
    storedName,
    url: `/api/uploads/resume/${storedName}`,
    originalName,
    size: file.size,
    mime: file.type || `application/${resolvedType.ext}`
  }
}

/** Resolves a stored filename to an absolute path, refusing traversal attempts. */
export function resolveStoredDocument(storedName: string) {
  const cleaned = path.basename(storedName)
  if (cleaned !== storedName || !/^[a-zA-Z0-9_-]+\.(pdf|doc|docx)$/.test(cleaned)) return null
  return path.join(uploadDir(), cleaned)
}

/** Reads a stored document, returning null when it does not exist. */
export async function readStoredDocument(storedName: string) {
  const resolved = resolveStoredDocument(storedName)
  if (!resolved) return null

  if (cloudUploadsConfigured()) {
    const result = await get('resumes/' + storedName, { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200) return null
    const bytes = Buffer.from(await new Response(result.stream).arrayBuffer())
    return { bytes, path: resolved }
  }
  if (process.env.VERCEL) return null
  try {
    const bytes = await readFile(resolved)
    return { bytes, path: resolved }
  } catch {
    return null
  }
}

/** True when the stored filename belongs to the given owner id. */
export function documentBelongsTo(storedName: string, ownerId: string) {
  const cleaned = path.basename(storedName)
  return cleaned.startsWith(`${ownerId.replace(/[^a-zA-Z0-9_-]/g, '')}-`)
}

export function contentTypeFor(storedName: string) {
  const match = /\.(pdf|docx|doc)$/i.exec(path.basename(storedName))
  const ext = match?.[1]?.toLowerCase()
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'docx')
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  return 'application/msword'
}

/** Uniform API path prefix for both serving and storing. */
export const RESUME_ROUTE_PREFIX = '/api/uploads/resume'
