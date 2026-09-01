import { createError } from 'h3'

const createFields = new Set([
  'title',
  'description',
  'serverType',
  'baseUrl',
  'endpointPath',
  'healthPath',
  'accessMode',
  'authType',
  'apiKeyName',
  'apiKey',
  'model',
  'version',
  'notes',
  'isMature',
  'isPublic',
])

const updateFields = new Set([
  'title',
  'description',
  'serverType',
  'baseUrl',
  'endpointPath',
  'healthPath',
  'accessMode',
  'authType',
  'apiKeyName',
  'apiKey',
  'model',
  'version',
  'notes',
  'isMature',
  'isPublic',
  'isActive',
])

const serverTypes = new Set(['A1111', 'COMFY', 'CUSTOM'])
const accessModes = new Set(['BROWSER', 'BACKEND', 'TAILSCALE', 'PUBLIC', 'LOCAL'])
const authTypes = new Set(['NONE', 'BEARER', 'HEADER', 'API_KEY'])

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, message: 'Expected a server settings object.' })
  }
  return value as Record<string, unknown>
}

function cleanString(value: unknown, max = 764): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: 'Server text fields must be strings.' })
  }
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function requireChoice(
  value: unknown,
  allowed: Set<string>,
  fallback: string,
  field: string,
): string {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw createError({ statusCode: 400, message: `Unsupported ${field}.` })
  }
  return value
}

function assertAllowedFields(input: Record<string, unknown>, allowed: Set<string>) {
  const unsupported = Object.keys(input).filter((key) => !allowed.has(key))
  if (unsupported.length) {
    throw createError({
      statusCode: 400,
      message: `Unsupported generator server field(s): ${unsupported.join(', ')}.`,
    })
  }
}

function validateBaseUrl(value: unknown, required: boolean): string | null | undefined {
  if (value === undefined && !required) return undefined
  const cleaned = cleanString(value)
  if (!cleaned) {
    if (required) throw createError({ statusCode: 400, message: 'Server URL is required.' })
    return null
  }

  let parsed: URL
  try {
    parsed = new URL(cleaned)
  } catch {
    throw createError({ statusCode: 400, message: 'Server URL must be a valid URL.' })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, message: 'Server URL must use http or https.' })
  }

  if (parsed.username || parsed.password) {
    throw createError({
      statusCode: 400,
      message: 'Put authentication in the key fields, not inside the server URL.',
    })
  }

  return parsed.toString().replace(/\/$/, '')
}

export function buildRainbowServerCreate(value: unknown) {
  const input = asRecord(value)
  assertAllowedFields(input, createFields)

  const title = cleanString(input.title, 160)
  if (!title) throw createError({ statusCode: 400, message: 'Server name is required.' })

  return {
    title,
    description: cleanString(input.description, 5000),
    serverType: requireChoice(input.serverType, serverTypes, 'COMFY', 'server type'),
    category: 'art-generation',
    baseUrl: validateBaseUrl(input.baseUrl, true),
    endpointPath: cleanString(input.endpointPath, 512),
    healthPath: cleanString(input.healthPath, 512),
    accessMode: requireChoice(input.accessMode, accessModes, 'BACKEND', 'access mode'),
    authType: requireChoice(input.authType, authTypes, 'NONE', 'authentication type'),
    apiKeyName: cleanString(input.apiKeyName, 255),
    apiKey: cleanString(input.apiKey, 4096),
    model: cleanString(input.model, 255),
    version: cleanString(input.version, 255),
    notes: cleanString(input.notes, 5000),
    isMature: input.isMature === true,
    // Sharing compute is always explicit. Never infer public from another field.
    isPublic: input.isPublic === true,
  }
}

export function buildRainbowServerUpdate(value: unknown) {
  const input = asRecord(value)
  assertAllowedFields(input, updateFields)
  const output: Record<string, unknown> = {}

  for (const field of ['title', 'description', 'endpointPath', 'healthPath', 'apiKeyName', 'apiKey', 'model', 'version', 'notes']) {
    if (field in input) output[field] = cleanString(input[field], field === 'description' || field === 'notes' ? 5000 : field === 'apiKey' ? 4096 : 764)
  }

  if ('baseUrl' in input) output.baseUrl = validateBaseUrl(input.baseUrl, true)
  if ('serverType' in input) output.serverType = requireChoice(input.serverType, serverTypes, 'COMFY', 'server type')
  if ('accessMode' in input) output.accessMode = requireChoice(input.accessMode, accessModes, 'BACKEND', 'access mode')
  if ('authType' in input) output.authType = requireChoice(input.authType, authTypes, 'NONE', 'authentication type')

  for (const field of ['isMature', 'isPublic', 'isActive']) {
    if (field in input) {
      if (typeof input[field] !== 'boolean') {
        throw createError({ statusCode: 400, message: `${field} must be true or false.` })
      }
      output[field] = input[field]
    }
  }

  return output
}

export function safeRainbowServer(server: Record<string, unknown>, userId: number) {
  // Kind Robots already masks stored keys. Rainbow drops the apiKey field entirely
  // so its browser contract can never accidentally start displaying secrets.
  const { apiKey: _apiKey, ...safe } = server
  return {
    ...safe,
    ownedByYou: Number(server.userId) === userId,
    hasApiKey: server.hasApiKey === true,
  }
}
