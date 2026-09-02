import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const dashboard = readFileSync('app/pages/dashboard.vue', 'utf8')
const detail = readFileSync('app/pages/agents/[id].vue', 'utf8')
const listBff = readFileSync(
  'server/api/agents/profiles/[id]/attention/index.get.ts',
  'utf8',
)
const resolveBff = readFileSync(
  'server/api/agents/profiles/[id]/attention/[requestId].patch.ts',
  'utf8',
)

// Human dashboard surfaces attention as a first-class signal, but reads it
// from canonical Kind Robots through Rainbow's BFF rather than a local store.
assert.match(dashboard, /\/api\/agents\/profiles\/\$\{profile\.id\}\/attention/)
assert.match(dashboard, /openAttentionTotal/)
assert.match(dashboard, /Needs attention/)
assert.match(dashboard, /attention-pill/)
assert.match(dashboard, /Open activity, notes & requests/)
assert.doesNotMatch(dashboard, /kindrobots\.org|Authorization:\s*Bearer|localStorage|sessionStorage/i)

// Per-agent workspace gives humans the narrow resolution lifecycle and shows
// whether a resolved request has made it back to the agent yet.
assert.match(detail, /type AttentionRequest/)
assert.match(detail, /'help' \| 'approval' \| 'decision' \| 'review'/)
assert.match(detail, /'OPEN' \| 'APPROVED' \| 'DECLINED' \| 'RESOLVED'/)
assert.match(detail, /\/attention`/)
assert.match(detail, /\/attention\/\$\{request\.id\}`/)
assert.match(detail, /resolveRequest\(request, 'APPROVED'\)/)
assert.match(detail, /resolveRequest\(request, 'DECLINED'\)/)
assert.match(detail, /resolveRequest\(request, 'RESOLVED'\)/)
assert.match(detail, /Optional response for the agent/)
assert.match(detail, /Waiting for next check-in/)
assert.match(detail, /Agent received/)
assert.doesNotMatch(detail, /kindrobots\.org|Authorization:\s*Bearer|localStorage|sessionStorage/i)

// Human API calls always require the encrypted Rainbow BFF delegation.
for (const source of [listBff, resolveBff]) {
  assert.match(source, /requireRainbowBff\(event\)/)
  assert.match(source, /kindRobotsAs/)
  assert.match(source, /Invalid agent profile id/)
}
assert.match(listBff, /\/api\/agent-profiles\/\$\{id\}\/attention/)
assert.match(resolveBff, /Invalid attention request id/)
assert.match(resolveBff, /new Set\(\['APPROVED', 'DECLINED', 'RESOLVED'\]\)/)
assert.match(resolveBff, /resolution must be 5000 characters or fewer/)
assert.match(resolveBff, /body:\s*\{ status, resolution \}/)
assert.doesNotMatch(resolveBff, /readBody<Record<string, unknown>>/)

console.log('Rainbow agent attention dashboard contract: OK')
