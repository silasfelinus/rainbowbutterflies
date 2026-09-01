import crypto from 'node:crypto'
import {
  deleteCookie,
  getCookie,
  setCookie,
  type H3Event,
} from 'h3'
import {
  PENDING_AUTH_TTL_MS,
  SESSION_TTL_MS,
  buildPendingAuthorization,
  buildRainbowSession,
  normalizeRainbowCallbackUri,
  normalizeRainbowGoogleCallbackUri,
  readPendingAuthorization,
  readRainbowSession,
  signCookiePayload,
  type PendingAuthorization,
  type RainbowIdentity,
  type RainbowSession,
} from '../../utils/authSessionContract'

export const PENDING_AUTH_COOKIE = 'rainbow-auth-flow'
export const SESSION_COOKIE = 'rainbow-session'
export const DELEGATION_COOKIE = 'rainbow-bff-delegation'

const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(48).toString('base64url')

function getSessionSecret(): string {
  const config = useRuntimeConfig()
  const configured = String(config.rainbowSessionSecret || '').trim()

  if (configured && configured.length < 32) {
    throw new Error('RAINBOW_SESSION_SECRET must be at least 32 characters when configured.')
  }

  return configured || EPHEMERAL_SESSION_SECRET
}

function cookieSecurity() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

function getDelegationKey() {
  return crypto
    .createHash('sha256')
    .update('rainbow-bff-delegation-v1\0')
    .update(getSessionSecret())
    .digest()
}

function sealDelegation(token: string, expiresAt: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getDelegationKey(), iv)
  const plaintext = Buffer.from(JSON.stringify({ token, expiresAt }), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    tag.toString('base64url'),
  ].join('.')
}

function openDelegation(value: string | undefined): { token: string; expiresAt: string } | null {
  if (!value) return null
  const [version, ivText, cipherText, tagText, extra] = value.split('.')
  if (version !== 'v1' || !ivText || !cipherText || !tagText || extra !== undefined) {
    return null
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getDelegationKey(),
      Buffer.from(ivText, 'base64url'),
    )
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherText, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
    const parsed = JSON.parse(plaintext) as { token?: unknown; expiresAt?: unknown }
    const token = typeof parsed.token === 'string' ? parsed.token.trim() : ''
    const expiresAt = typeof parsed.expiresAt === 'string' ? parsed.expiresAt : ''
    const expiry = Date.parse(expiresAt)
    if (!token || !Number.isFinite(expiry) || expiry <= Date.now()) return null
    return { token, expiresAt }
  } catch {
    return null
  }
}

export function getRainbowSiteOrigin(): string {
  const config = useRuntimeConfig()
  const raw = String(config.public.siteUrl || '').trim()
  const parsed = new URL(raw)
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

  if (parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error('NUXT_PUBLIC_SITE_URL must be a clean site origin.')
  }
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
    throw new Error('NUXT_PUBLIC_SITE_URL must use https outside local development.')
  }

  return parsed.origin
}

export function getRainbowCallbackUri(): string {
  const callback = new URL('/auth/callback', `${getRainbowSiteOrigin()}/`).toString()
  const normalized = normalizeRainbowCallbackUri(callback)
  if (!normalized) throw new Error('Configured Rainbow auth callback URI is invalid.')
  return normalized
}

export function getRainbowGoogleCallbackUri(): string {
  const callback = new URL(
    '/auth/google/callback',
    `${getRainbowSiteOrigin()}/`,
  ).toString()
  const normalized = normalizeRainbowGoogleCallbackUri(callback)
  if (!normalized) {
    throw new Error('Configured Rainbow Google callback URI is invalid.')
  }
  return normalized
}

export function createPendingAuthFlow(input: {
  state: string
  verifier: string
  returnTo?: string
}): PendingAuthorization {
  return buildPendingAuthorization({
    ...input,
    redirectUri: getRainbowCallbackUri(),
  })
}

export function createPendingGoogleAuthFlow(input: {
  state: string
  verifier: string
  returnTo?: string
}): PendingAuthorization {
  return buildPendingAuthorization({
    ...input,
    redirectUri: getRainbowGoogleCallbackUri(),
  })
}

export function setPendingAuthCookie(
  event: H3Event,
  flow: PendingAuthorization,
): void {
  setCookie(event, PENDING_AUTH_COOKIE, signCookiePayload(flow, getSessionSecret()), {
    ...cookieSecurity(),
    maxAge: Math.floor(PENDING_AUTH_TTL_MS / 1000),
  })
}

export function readPendingAuthCookie(event: H3Event): PendingAuthorization | null {
  return readPendingAuthorization(
    getCookie(event, PENDING_AUTH_COOKIE),
    getSessionSecret(),
  )
}

export function clearPendingAuthCookie(event: H3Event): void {
  deleteCookie(event, PENDING_AUTH_COOKIE, cookieSecurity())
}

export function setRainbowSessionCookie(
  event: H3Event,
  user: RainbowIdentity,
): RainbowSession {
  const session = buildRainbowSession({ user })
  setCookie(event, SESSION_COOKIE, signCookiePayload(session, getSessionSecret()), {
    ...cookieSecurity(),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
  return session
}

export function readRainbowSessionCookie(event: H3Event): RainbowSession | null {
  return readRainbowSession(
    getCookie(event, SESSION_COOKIE),
    getSessionSecret(),
  )
}

export function clearRainbowSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, cookieSecurity())
}

/**
 * Store the Kind Robots first-party delegation only in an authenticated,
 * encrypted HttpOnly cookie. Browser JavaScript never receives the token and
 * inspecting the cookie reveals only AES-GCM ciphertext.
 */
export function setRainbowDelegationCookie(event: H3Event, token: string): void {
  const cleanToken = token.trim()
  if (!cleanToken) throw new Error('A first-party delegation token is required.')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  setCookie(event, DELEGATION_COOKIE, sealDelegation(cleanToken, expiresAt), {
    ...cookieSecurity(),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  })
}

export function readRainbowDelegationCookie(event: H3Event): string | null {
  return openDelegation(getCookie(event, DELEGATION_COOKIE))?.token ?? null
}

export function clearRainbowDelegationCookie(event: H3Event): void {
  deleteCookie(event, DELEGATION_COOKIE, cookieSecurity())
}
