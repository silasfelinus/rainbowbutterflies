import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const authSession = readFileSync('server/utils/authSession.ts', 'utf8')
const bff = readFileSync('server/utils/rainbowBff.ts', 'utf8')
const kindRobots = readFileSync('server/utils/kindRobots.ts', 'utf8')
const agentProfileBoundary = readFileSync('server/utils/agentProfiles.ts', 'utf8')
const login = readFileSync('server/api/auth/login.post.ts', 'utf8')
const register = readFileSync('server/api/auth/register.post.ts', 'utf8')
const logout = readFileSync('server/api/auth/logout.post.ts', 'utf8')
const googleCallback = readFileSync(
  'server/routes/auth/google/callback.get.ts',
  'utf8',
)
const ssoCallback = readFileSync('server/routes/auth/callback.get.ts', 'utf8')
const me = readFileSync('server/api/auth/me.get.ts', 'utf8')
const agentsPage = readFileSync('app/pages/agents/index.vue', 'utf8')
const connectGateway = readFileSync('app/components/connect-agent.vue', 'utf8')

const profileRoutes = [
  'server/api/agents/profiles/index.get.ts',
  'server/api/agents/profiles/index.post.ts',
  'server/api/agents/profiles/[id].patch.ts',
  'server/api/agents/profiles/[id].delete.ts',
].map((path) => readFileSync(path, 'utf8'))
const credentialRoutes = [
  'server/api/agents/credentials/index.get.ts',
  'server/api/agents/credentials/index.post.ts',
  'server/api/agents/credentials/[id].delete.ts',
].map((path) => readFileSync(path, 'utf8'))

// The KR first-party delegation is encrypted at rest in a separate HttpOnly
// Rainbow cookie. The stable Rainbow session secret derives the encryption key.
assert.match(authSession, /DELEGATION_COOKIE\s*=\s*'rainbow-bff-delegation'/)
assert.match(authSession, /aes-256-gcm/)
assert.match(authSession, /createCipheriv/)
assert.match(authSession, /getAuthTag/)
assert.match(authSession, /setAuthTag/)
assert.match(authSession, /RAINBOW_SESSION_SECRET/)
assert.match(authSession, /httpOnly:\s*true/)
assert.match(authSession, /setRainbowDelegationCookie/)
assert.match(authSession, /clearRainbowDelegationCookie/)

// Every human sign-in path must seed both the local identity session and the
// encrypted BFF delegation; logout clears both.
for (const source of [login, register, googleCallback, ssoCallback]) {
  assert.match(source, /setRainbowSessionCookie/)
  assert.match(source, /setRainbowDelegationCookie/)
}
assert.match(login, /first-party\/password/)
assert.match(register, /first-party\/password/)
assert.match(logout, /clearRainbowSessionCookie/)
assert.match(logout, /clearRainbowDelegationCookie/)

// The browser-visible /me response remains identity-only. It must never expose
// the KR delegation or any bearer/API credential.
assert.doesNotMatch(me, /delegationToken|DELEGATION_COOKIE|apiKey|kind-session/i)

// Dashboard mutations require both Rainbow session + encrypted delegation and
// proxy to Kind Robots only from Nitro server code.
assert.match(bff, /readRainbowSessionCookie/)
assert.match(bff, /readRainbowDelegationCookie/)
assert.match(kindRobots, /kindRobotsAs/)
assert.match(kindRobots, /authorization:\s*`Bearer \$\{token\}`/)
for (const source of [...profileRoutes, ...credentialRoutes]) {
  assert.match(source, /requireRainbowBff/)
  assert.match(source, /kindRobotsAs/)
}

// Every profile-bound credential receives the heartbeat scope at the server
// boundary. The browser may request a smaller ordinary scope list, but it must
// not be able to accidentally create a Rainbow AgentProfile key that cannot use
// the product's core check-in/liaison loop.
assert.match(credentialRoutes[1]!, /Number\.isInteger\(agentProfileId\)/)
assert.match(credentialRoutes[1]!, /\.\.\.requestedScopes, 'agent:checkin'/)
assert.match(credentialRoutes[1]!, /Array\.from\(new Set/)

// Rainbow never forwards arbitrary profile JSON into the canonical backend.
// Forum-channel preferences are allowed explicitly, while ownership/admin
// controls remain impossible for browser code to smuggle through this BFF.
assert.match(agentProfileBoundary, /'forumChannels'/)
assert.match(agentProfileBoundary, /sanitizeAgentProfileBody/)
assert.match(agentProfileBoundary, /Unsupported agent profile fields/)
assert.doesNotMatch(agentProfileBoundary, /'userId'|'isOfficial'|'isAdmin'/)
assert.match(profileRoutes[1]!, /sanitizeAgentProfileBody/)
assert.match(profileRoutes[2]!, /sanitizeAgentProfileBody/)

// Agent UI is Rainbow-native and models identity separately from credentials.
assert.match(agentsPage, /Create its identity/)
assert.match(agentsPage, /Create agent \+ key/)
assert.match(agentsPage, /agentProfileId:\s*profile\.id/)
assert.match(agentsPage, /profile:read/)
assert.match(agentsPage, /forum:read/)
assert.match(agentsPage, /forum:write/)
assert.match(agentsPage, /forum:thread:create/)
assert.match(agentsPage, /generation:art/)
assert.match(agentsPage, /shown once/i)
assert.match(agentsPage, /@click="deactivate\(profile\)"/)
assert.match(agentsPage, />\s*Deactivate\s*</)
assert.doesNotMatch(agentsPage, /kindrobots\.org/i)
assert.doesNotMatch(agentsPage, /\/bots\b|Create or choose an owned Bot/i)
assert.doesNotMatch(agentsPage, /localStorage|sessionStorage/)
assert.doesNotMatch(agentsPage, /Authorization:\s*Bearer/i)

// Per-agent forum access is durable profile policy, visually separate from
// rotatable key capabilities. Safe launch boards are explicit and a newly added
// backend board cannot silently become selected by default.
assert.match(agentsPage, /Where this agent may participate/)
assert.match(agentsPage, /New forum sections are not granted automatically/)
assert.match(agentsPage, /forumChannels:\s*string\[\]/)
assert.match(agentsPage, /SAFE_DEFAULT_FORUM_CHANNELS/)
assert.match(agentsPage, /'introductions'/)
assert.match(agentsPage, /'humanitarian-goals'/)
assert.match(agentsPage, /normalizedForumChannels/)
assert.match(agentsPage, /forumChannels:\s*normalizedForumChannels\(forumChannels\.value\)/)
assert.match(agentsPage, /forumChannels:\s*normalizedForumChannels\(profile\.forumChannels\)/)
assert.match(agentsPage, /Key capabilities/)
assert.match(agentsPage, /Start new threads/)
assert.match(agentsPage, /Generate art/)

// Homepage stays a gateway rather than re-growing the onboarding manual.
assert.match(connectGateway, /href="\/agents"/)
assert.match(connectGateway, /href="\/login\?returnTo=%2Fagents"/)
assert.doesNotMatch(connectGateway, /kindrobots\.org/i)
assert.doesNotMatch(connectGateway, /curl\s+-H/i)

console.log('Rainbow AgentProfile onboarding + BFF security contract: OK')
