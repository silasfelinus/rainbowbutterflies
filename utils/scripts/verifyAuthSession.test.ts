import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildPendingAuthorization,
  buildRainbowSession,
  evaluateAuthorizationCallback,
  normalizeLocalReturnPath,
  normalizeRainbowCallbackUri,
  normalizeRainbowGoogleCallbackUri,
  pkceS256,
  randomBase64Url,
  readPendingAuthorization,
  readRainbowSession,
  signCookiePayload,
} from '../authSessionContract.js'

const secret = 'rainbow-test-signing-secret-0123456789abcdef'
const otherSecret = 'rainbow-other-signing-secret-0123456789abcdef'
const now = Date.parse('2026-08-30T06:00:00.000Z')

assert.equal(normalizeLocalReturnPath('/#commons'), '/#commons')
assert.equal(
  normalizeLocalReturnPath('/forum?sort=recent#thread-12'),
  '/forum?sort=recent#thread-12',
)
assert.equal(normalizeLocalReturnPath('//evil.example'), '/#commons')
assert.equal(normalizeLocalReturnPath('https://evil.example'), '/#commons')
assert.equal(normalizeLocalReturnPath('/\\evil.example'), '/#commons')

assert.equal(
  normalizeRainbowCallbackUri('https://rainbowbutterflies.org/auth/callback'),
  'https://rainbowbutterflies.org/auth/callback',
)
assert.equal(
  normalizeRainbowGoogleCallbackUri(
    'https://rainbowbutterflies.org/auth/google/callback',
  ),
  'https://rainbowbutterflies.org/auth/google/callback',
)
assert.equal(
  normalizeRainbowGoogleCallbackUri(
    'http://localhost:3000/auth/google/callback',
  ),
  'http://localhost:3000/auth/google/callback',
)
assert.equal(
  normalizeRainbowCallbackUri(
    'https://rainbowbutterflies.org/auth/google/callback',
  ),
  null,
)
assert.equal(
  normalizeRainbowGoogleCallbackUri('https://rainbowbutterflies.org/auth/callback'),
  null,
)
assert.equal(
  normalizeRainbowCallbackUri('https://rainbowbutterflies.org/auth/callback?code=x'),
  null,
)

const state = randomBase64Url(32)
const verifier = randomBase64Url(32)
assert.equal(state.length >= 43, true)
assert.equal(verifier.length >= 43, true)
assert.equal(pkceS256(verifier).length, 43)

const pending = buildPendingAuthorization({
  state,
  verifier,
  redirectUri: 'https://rainbowbutterflies.org/auth/callback',
  returnTo: '/#commons',
  now,
})
const signedPending = signCookiePayload(pending, secret)
assert.deepEqual(readPendingAuthorization(signedPending, secret), pending)
assert.equal(readPendingAuthorization(signedPending, otherSecret), null)

const googlePending = buildPendingAuthorization({
  state,
  verifier,
  redirectUri: 'https://rainbowbutterflies.org/auth/google/callback',
  returnTo: '/dashboard',
  now,
})
assert.equal(
  readPendingAuthorization(signCookiePayload(googlePending, secret), secret)?.redirectUri,
  'https://rainbowbutterflies.org/auth/google/callback',
)

const tamperedPending = `${signedPending.slice(0, -1)}${
  signedPending.endsWith('A') ? 'B' : 'A'
}`
assert.equal(readPendingAuthorization(tamperedPending, secret), null)

assert.deepEqual(
  evaluateAuthorizationCallback(pending, {
    code: 'kr-one-shot-code',
    state,
    now: now + 1000,
  }),
  {
    ok: true,
    code: 'kr-one-shot-code',
    verifier,
    redirectUri: 'https://rainbowbutterflies.org/auth/callback',
    returnTo: '/#commons',
  },
)
assert.deepEqual(
  evaluateAuthorizationCallback(null, {
    code: 'kr-one-shot-code',
    state,
    now,
  }),
  { ok: false, reason: 'missing-flow' },
)
assert.deepEqual(
  evaluateAuthorizationCallback(pending, {
    code: 'kr-one-shot-code',
    state,
    now: pending.expiresAt,
  }),
  { ok: false, reason: 'expired' },
)
assert.deepEqual(
  evaluateAuthorizationCallback(pending, {
    code: 'kr-one-shot-code',
    state: `${state.slice(0, -1)}X`,
    now,
  }),
  { ok: false, reason: 'state' },
)
assert.deepEqual(
  evaluateAuthorizationCallback(pending, {
    code: '',
    state,
    now,
  }),
  { ok: false, reason: 'code' },
)

const session = buildRainbowSession({
  user: { id: 42, username: 'rainbow-human' },
  now,
})
const signedSession = signCookiePayload(session, secret)
assert.deepEqual(readRainbowSession(signedSession, secret, now + 1000), session)
assert.equal(readRainbowSession(signedSession, secret, session.expiresAt), null)
assert.equal(readRainbowSession(signedSession, otherSecret, now + 1000), null)
assert.throws(
  () => buildRainbowSession({ user: { id: 0, username: 'invalid' }, now }),
  /invalid first-party identity/,
)
assert.throws(
  () => signCookiePayload(session, 'short'),
  /at least 32 characters/,
)

const authSessionSource = readFileSync('server/utils/authSession.ts', 'utf8')
const identityControlSource = readFileSync('app/components/identity-control.vue', 'utf8')
const homeSource = readFileSync('app/pages/index.vue', 'utf8')
const loginPageSource = readFileSync('app/pages/login.vue', 'utf8')
const legacyCallbackSource = readFileSync('server/routes/auth/callback.get.ts', 'utf8')
const googleStartSource = readFileSync('server/api/auth/google/start.get.ts', 'utf8')
const googleCallbackSource = readFileSync(
  'server/routes/auth/google/callback.get.ts',
  'utf8',
)

assert.match(authSessionSource, /httpOnly:\s*true/)
assert.match(authSessionSource, /sameSite:\s*'lax'/)
assert.match(homeSource, /href:\s*'\/login\?returnTo=/)
assert.match(loginPageSource, /Continue with Google/)
assert.match(googleStartSource, /accounts\.google\.com\/o\/oauth2\/v2\/auth/)
assert.match(googleStartSource, /code_challenge/)
assert.match(googleCallbackSource, /first-party\/google\/exchange/)
assert.match(identityControlSource, /href="\/login\?returnTo=/)
assert.doesNotMatch(identityControlSource, /Sign in with Kind Robots|Signed in through Kind Robots/)
assert.doesNotMatch(identityControlSource, /localStorage|sessionStorage/)
assert.doesNotMatch(legacyCallbackSource, /localStorage|sessionStorage/)
assert.doesNotMatch(googleCallbackSource, /localStorage|sessionStorage/)
assert.doesNotMatch(googleStartSource, /GOOGLE_SECRET|googleSecret/)
assert.doesNotMatch(googleCallbackSource, /GOOGLE_SECRET|googleSecret/)
assert.doesNotMatch(loginPageSource, /GOOGLE_SECRET|googleSecret/)
assert.doesNotMatch(legacyCallbackSource, /kind-session|password|apiKey|agent.?credential/i)

console.log('Rainbow auth session contract OK')
