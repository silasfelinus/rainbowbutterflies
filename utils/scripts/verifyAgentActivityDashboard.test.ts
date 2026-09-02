import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('app/pages/dashboard.vue', 'utf8')
const detail = readFileSync('app/pages/agents/[id].vue', 'utf8')
const connectGateway = readFileSync('app/components/connect-agent.vue', 'utf8')
const activityBff = readFileSync(
  'server/api/agents/profiles/[id]/activity.get.ts',
  'utf8',
)
const notesBff = readFileSync(
  'server/api/agents/profiles/[id]/notes.post.ts',
  'utf8',
)
const workspaceBff = readFileSync('server/api/dashboard/workspace.get.ts', 'utf8')
const credentialBff = readFileSync(
  'server/api/agents/credentials/index.post.ts',
  'utf8',
)

// Human dashboard is Rainbow-native and summarizes canonical Kind Robots state
// instead of creating a second local activity/object/conversation store.
assert.match(dashboard, /\/api\/agents\/profiles/)
assert.match(dashboard, /\/api\/agents\/profiles\/\$\{profile\.id\}\/activity/)
assert.match(dashboard, /\/api\/dashboard\/workspace/)
assert.match(dashboard, /\/api\/mission\/summary\?days=30/)
assert.match(dashboard, /pendingNotesTotal/)
assert.match(dashboard, /checkedInCount/)
assert.match(dashboard, /openRequests/)
assert.match(dashboard, /Recent direct replies/)
assert.match(dashboard, /Canonical things you’ve made/)
assert.match(dashboard, /Mission pulse · last 30 days/)
assert.match(dashboard, /activity context, not an unread inbox/)
assert.match(dashboard, /Open activity, notes & requests/)
assert.match(dashboard, /:href="`\/agents\/\$\{profile\.id\}`"/)
assert.doesNotMatch(dashboard, /kindrobots\.org|localStorage|sessionStorage/i)

// Workspace reads require the encrypted first-party Rainbow delegation and
// delegate to the narrow Kind Robots v1 dashboard endpoint.
assert.match(workspaceBff, /requireRainbowBff\(event\)/)
assert.match(workspaceBff, /kindRobotsAs/)
assert.match(workspaceBff, /Cache-Control', 'no-store'/)
assert.match(workspaceBff, /\/api\/v1\/rainbow\/dashboard/)

// The homepage agent gateway must expose the control loop once a human is
// signed in instead of making /dashboard a hidden URL.
assert.match(connectGateway, /href="\/dashboard"/)
assert.match(connectGateway, /Open your agent dashboard/)
assert.doesNotMatch(connectGateway, /kindrobots\.org/i)

// Per-agent workspace exposes the human/agent control loop: read heartbeat
// history, queue a note, and show whether each note has been delivered.
assert.match(detail, /\/activity`/)
assert.match(detail, /\/notes`/)
assert.match(detail, /method:\s*'POST'/)
assert.match(detail, /Send on next check-in/)
assert.match(detail, /Waiting for next check-in/)
assert.match(detail, /Check-in history/)
assert.match(detail, /Delivery history/)
assert.match(detail, /maxlength="5000"/)
assert.doesNotMatch(detail, /kindrobots\.org|Authorization:\s*Bearer|localStorage|sessionStorage/i)

// Both per-agent human activity routes require the encrypted Rainbow BFF delegation.
for (const source of [activityBff, notesBff]) {
  assert.match(source, /requireRainbowBff\(event\)/)
  assert.match(source, /kindRobotsAs/)
  assert.match(source, /Invalid agent profile id/)
}
assert.match(activityBff, /\/api\/agent-profiles\/\$\{id\}\/activity/)
assert.match(notesBff, /\/api\/agent-profiles\/\$\{id\}\/notes/)
assert.match(notesBff, /body:\s*\{ body \}/)
assert.match(notesBff, /5000 characters or fewer/)

// Check-in is a basic property of a Rainbow AgentProfile credential. Humans do
// not need to find a special checkbox before their scheduled agent can report.
assert.match(credentialBff, /'agent:checkin'/)
assert.match(credentialBff, /Number\.isInteger\(agentProfileId\)/)
assert.match(credentialBff, /new Set\(\[\.\.\.requestedScopes, 'agent:checkin'\]\)/)

console.log('Rainbow agent activity + full human workspace contract: OK')
