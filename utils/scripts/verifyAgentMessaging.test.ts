import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const inbox = readFileSync('app/pages/messages.vue', 'utf8')
const publicAgent = readFileSync('app/pages/community/agents/[id].vue', 'utf8')
const messagingKeys = readFileSync('app/pages/agents/messaging.vue', 'utf8')
const credentialCreate = readFileSync(
  'server/api/agents/credentials/index.post.ts',
  'utf8',
)
const listRoute = readFileSync('server/api/messages/index.get.ts', 'utf8')
const startRoute = readFileSync('server/api/messages/index.post.ts', 'utf8')
const historyRoute = readFileSync('server/api/messages/[threadId].get.ts', 'utf8')
const replyRoute = readFileSync('server/api/messages/[threadId].post.ts', 'utf8')
const readRoute = readFileSync(
  'server/api/messages/[threadId]/read.patch.ts',
  'utf8',
)

const messageRoutes = [listRoute, startRoute, historyRoute, replyRoute, readRoute]

// Rainbow is a first-party UI/BFF only. Every private messaging route requires
// the signed-in Rainbow session + encrypted delegation and forwards only to the
// canonical Kind Robots AgentProfile message family.
for (const source of messageRoutes) {
  assert.match(source, /requireRainbowBff/)
  assert.match(source, /kindRobotsAs/)
  assert.match(source, /Cache-Control', 'no-store'/)
  assert.match(source, /\/api\/v1\/agent\/messages/)
  assert.doesNotMatch(source, /localStorage|sessionStorage|apiKey|AgentMessageThread/)
}
assert.match(listRoute, /path:\s*'\/api\/v1\/agent\/messages'/)
assert.match(startRoute, /method:\s*'POST'/)
assert.match(replyRoute, /method:\s*'POST'/)
assert.match(readRoute, /method:\s*'PATCH'/)

// Browser input is deliberately narrower than the canonical backend. It cannot
// choose a sender, operator, credential, read timestamp, or arbitrary upstream
// URL; message bodies/client keys and pagination are bounded before forwarding.
assert.match(startRoute, /agentProfileId/)
assert.match(startRoute, /length > 5000/)
assert.match(startRoute, /length > 120/)
assert.doesNotMatch(startRoute, /senderKind|senderUserId|senderAgentProfileId|credentialId|readAt/)
assert.match(replyRoute, /length > 5000/)
assert.match(replyRoute, /length > 120/)
assert.doesNotMatch(replyRoute, /senderKind|senderUserId|senderAgentProfileId|credentialId|readAt/)
assert.match(historyRoute, /requestedLimit > 100/)
assert.match(historyRoute, /positiveId\(query\.beforeId, 'beforeId'\)/)

// The inbox keeps consent explicit. New conversations require the human's
// public+allowMessages preferences and a public AgentProfile that advertises
// allowMessages; old history remains readable when either side later opts out.
assert.match(inbox, /const canStartMessages = computed\(\(\) => isPublic\.value && allowMessages\.value\)/)
assert.match(inbox, /targetCanMessage/)
assert.match(inbox, /Existing conversation history remains available to you/)
assert.match(inbox, /Nothing opens silently/)
assert.match(inbox, /\/api\/community\/preferences/)
assert.match(inbox, /\/api\/messages/)
assert.match(inbox, /maxlength="5000"/)
assert.match(inbox, /clientKey\(\)/)
assert.doesNotMatch(inbox, /localStorage|sessionStorage|Authorization:\s*Bearer|delegationToken/)

// Public AgentProfiles expose a message CTA only when that profile opted in.
assert.match(publicAgent, /v-if="agent\.allowMessages" class="profile-actions"/)
assert.match(publicAgent, /`\/messages\?agent=\$\{agent\.id\}`/)
assert.match(publicAgent, /Own an agent\? Enable reply access/)

// Machine write access is a separate, visible credential capability. Existing
// keys never gain agent:message automatically. An owner chooses one exact key,
// a replacement preserves that key's scopes and adds only messaging, while a
// profile with no key receives the narrow profile:read + messaging starting set.
assert.match(messagingKeys, /function scopesWithMessaging/)
assert.match(messagingKeys, /sourceCredential\?\.scopes \?\? \['profile:read'\]/)
assert.match(messagingKeys, /\.\.\.\(sourceCredential\?\.scopes \?\? \['profile:read'\]\), 'agent:message'/)
assert.match(messagingKeys, /Array\.from\(/)
assert.match(messagingKeys, /new Set\(/)
assert.match(messagingKeys, /Choose a key to upgrade/)
assert.match(messagingKeys, /Add messaging to replacement/)
assert.match(messagingKeys, /Rotate this messaging key/)
assert.match(messagingKeys, /Issue minimal messaging key/)
assert.match(messagingKeys, /Old keys are never widened automatically/)
assert.match(messagingKeys, /shown once/i)
assert.doesNotMatch(messagingKeys, /scopes:\s*\['profile:read', 'forum:read', 'forum:write', 'agent:message'\]/)
assert.doesNotMatch(messagingKeys, /localStorage|sessionStorage/)

// Credential labels are VARCHAR(255) in the canonical schema. Appending a
// messaging suffix to an already-long label must be bounded before the write.
assert.match(messagingKeys, /const CREDENTIAL_LABEL_LIMIT = 255/)
assert.match(messagingKeys, /function messagingLabel/)
assert.match(messagingKeys, /CREDENTIAL_LABEL_LIMIT - suffix\.length/)
assert.match(messagingKeys, /base\.slice\(0, room\)/)
assert.match(messagingKeys, /label:\s*messagingLabel\(profile, sourceCredential\)/)

// Rainbow's credential BFF retains the established heartbeat guarantee, but
// agent:message is never injected there. That scope exists only by the owner's
// explicit choice on the messaging-key screen above.
assert.match(credentialCreate, /\.\.\.requestedScopes, 'agent:checkin'/)
assert.doesNotMatch(credentialCreate, /\.\.\.requestedScopes, 'agent:message'/)

console.log('Rainbow AgentProfile messaging contract: OK')
