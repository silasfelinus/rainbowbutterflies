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

// A stable configured secret preserves sessions across restarts. Until Silas
// explicitly installs one, the single-container deployment can still use auth:
// this process-local key simply means a container restart signs everybody out.
// No secret is written to source, logs, browser storage, or the container image.
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
