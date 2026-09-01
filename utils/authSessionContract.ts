import crypto from 'node:crypto'

export const RAINBOW_AUTH_CLIENT_ID = 'rainbow-butterflies'
export const PENDING_AUTH_TTL_MS = 5 * 60 * 1000
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/
const MAX_SIGNED_VALUE_LENGTH = 4096
const RAINBOW_AUTH_CALLBACK_PATHS = new Set([
  '/auth/callback',
  '/auth/google/callback',
])

export type RainbowIdentity = {
  id: number
  username: string
}

export type PendingAuthorization = {
  kind: 'pending-auth'
  state: string
  verifier: string
  redirectUri: string
  returnTo: string
  issuedAt: number
  expiresAt: number
}

export type RainbowSession = {
  kind: 'session'
  user: RainbowIdentity
  issuedAt: number
  expiresAt: number
}

export type CallbackDecision =
  | {
      ok: true
      code: string
      verifier: string
      redirectUri: string
      returnTo: string
    }
  | {
      ok: false
      reason: 'missing-flow' | 'expired' | 'state' | 'code'
    }

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

function signatureFor(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('base64url')
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  )
}

export function signCookiePayload(value: unknown, secret: string): string {
  if (secret.length < 32) {
    throw new Error('Rainbow session signing secret must be at least 32 characters.')
  }

  const payload = encodeJson(value)
  return `${payload}.${signatureFor(payload, secret)}`
}

export function verifyCookiePayload<T>(
  signedValue: unknown,
  secret: string,
): T | null {
  const raw = cleanString(signedValue)
  if (!raw || raw.length > MAX_SIGNED_VALUE_LENGTH || secret.length < 32) return null

  const separator = raw.lastIndexOf('.')
  if (separator <= 0 || separator === raw.length - 1) return null

  const payload = raw.slice(0, separator)
  const signature = raw.slice(separator + 1)
  if (!BASE64URL_PATTERN.test(payload) || !BASE64URL_PATTERN.test(signature)) return null

  const expected = signatureFor(payload, secret)
  if (!safeEqual(signature, expected)) return null

  return decodeJson<T>(payload)
}

export function randomBase64Url(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function pkceS256(verifier: string): string {
  return crypto.createHash('sha256').update(verifier, 'ascii').digest('base64url')
}

export function normalizeLocalReturnPath(
  value: unknown,
  fallback = '/#commons',
): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return fallback

  const candidate = raw.trim()
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    candidate.length > 2048
  ) {
    return fallback
  }

  try {
    const base = 'https://rainbowbutterflies.invalid'
    const parsed = new URL(candidate, base)
    if (parsed.origin !== base) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}

export function normalizeRainbowAuthCallbackUri(value: unknown): string | null {
  const raw = cleanString(value)
  if (!raw || raw.length > 1024) return null

  try {
    const url = new URL(raw)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.username || url.password || url.hash || url.search) return null
    if (!RAINBOW_AUTH_CALLBACK_PATHS.has(url.pathname)) return null
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    return url.toString()
  } catch {
    return null
  }
}

/** Backward-compatible name for the original first-party callback validator. */
export function normalizeRainbowCallbackUri(value: unknown): string | null {
  const normalized = normalizeRainbowAuthCallbackUri(value)
  return normalized && new URL(normalized).pathname === '/auth/callback'
    ? normalized
    : null
}

export function normalizeRainbowGoogleCallbackUri(value: unknown): string | null {
  const normalized = normalizeRainbowAuthCallbackUri(value)
  return normalized && new URL(normalized).pathname === '/auth/google/callback'
    ? normalized
    : null
}

export function buildPendingAuthorization(input: {
  state: string
  verifier: string
  redirectUri: string
  returnTo?: string
  now?: number
}): PendingAuthorization {
  const now = input.now ?? Date.now()
  const state = cleanString(input.state)
  const verifier = cleanString(input.verifier)
  const redirectUri = normalizeRainbowAuthCallbackUri(input.redirectUri)

  if (state.length < 43 || !BASE64URL_PATTERN.test(state)) {
    throw new Error('Rainbow auth state must be a high-entropy base64url value.')
  }
  if (verifier.length < 43 || verifier.length > 128 || !BASE64URL_PATTERN.test(verifier)) {
    throw new Error('Rainbow PKCE verifier must be a valid base64url verifier.')
  }
  if (!redirectUri) {
    throw new Error('Rainbow auth callback URI is invalid.')
  }

  return {
    kind: 'pending-auth',
    state,
    verifier,
    redirectUri,
    returnTo: normalizeLocalReturnPath(input.returnTo),
    issuedAt: now,
    expiresAt: now + PENDING_AUTH_TTL_MS,
  }
}

function isPendingAuthorization(value: unknown): value is PendingAuthorization {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  return (
    row.kind === 'pending-auth' &&
    typeof row.state === 'string' &&
    row.state.length >= 43 &&
    BASE64URL_PATTERN.test(row.state) &&
    typeof row.verifier === 'string' &&
    row.verifier.length >= 43 &&
    row.verifier.length <= 128 &&
    BASE64URL_PATTERN.test(row.verifier) &&
    Boolean(normalizeRainbowAuthCallbackUri(row.redirectUri)) &&
    typeof row.returnTo === 'string' &&
    normalizeLocalReturnPath(row.returnTo, '') === row.returnTo &&
    typeof row.issuedAt === 'number' &&
    Number.isFinite(row.issuedAt) &&
    typeof row.expiresAt === 'number' &&
    Number.isFinite(row.expiresAt) &&
    row.expiresAt > row.issuedAt
  )
}

export function readPendingAuthorization(
  signedValue: unknown,
  secret: string,
): PendingAuthorization | null {
  const decoded = verifyCookiePayload<unknown>(signedValue, secret)
  return isPendingAuthorization(decoded) ? decoded : null
}

export function evaluateAuthorizationCallback(
  flow: PendingAuthorization | null,
  input: { code?: unknown; state?: unknown; now?: number },
): CallbackDecision {
  if (!flow) return { ok: false, reason: 'missing-flow' }

  const now = input.now ?? Date.now()
  if (flow.expiresAt <= now) return { ok: false, reason: 'expired' }

  const state = cleanString(input.state)
  if (!state || !safeEqual(state, flow.state)) {
    return { ok: false, reason: 'state' }
  }

  const code = cleanString(input.code)
  if (!code || code.length > 256) return { ok: false, reason: 'code' }

  return {
    ok: true,
    code,
    verifier: flow.verifier,
    redirectUri: flow.redirectUri,
    returnTo: flow.returnTo,
  }
}

export function buildRainbowSession(input: {
  user: RainbowIdentity
  now?: number
}): RainbowSession {
  const id = Number(input.user?.id)
  const username = cleanString(input.user?.username)
  if (!Number.isInteger(id) || id <= 0 || !username || username.length > 255) {
    throw new Error('Kind Robots returned an invalid first-party identity.')
  }

  const now = input.now ?? Date.now()
  return {
    kind: 'session',
    user: { id, username },
    issuedAt: now,
    expiresAt: now + SESSION_TTL_MS,
  }
}

function isRainbowSession(value: unknown): value is RainbowSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  const user = row.user
  if (!user || typeof user !== 'object' || Array.isArray(user)) return false
  const identity = user as Record<string, unknown>

  return (
    row.kind === 'session' &&
    Number.isInteger(identity.id) &&
    Number(identity.id) > 0 &&
    typeof identity.username === 'string' &&
    identity.username.trim().length > 0 &&
    identity.username.length <= 255 &&
    typeof row.issuedAt === 'number' &&
    Number.isFinite(row.issuedAt) &&
    typeof row.expiresAt === 'number' &&
    Number.isFinite(row.expiresAt) &&
    row.expiresAt > row.issuedAt
  )
}

export function readRainbowSession(
  signedValue: unknown,
  secret: string,
  now = Date.now(),
): RainbowSession | null {
  const decoded = verifyCookiePayload<unknown>(signedValue, secret)
  if (!isRainbowSession(decoded) || decoded.expiresAt <= now) return null
  return decoded
}
