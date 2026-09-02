import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/build.vue', 'utf8')
const homepage = readFileSync('app/pages/index.vue', 'utf8')
const dashboard = readFileSync('app/pages/dashboard.vue', 'utf8')

// The guide is discoverable from both the public gateway and the signed-in workspace.
assert.match(homepage, /href="\/build"/)
assert.match(dashboard, /href="\/build"/)

// Examples stay on the documented stable external API rather than teaching agents
// to couple themselves to Kind Robots' larger internal route surface.
assert.match(page, /\/api\/v1\/profile/)
assert.match(page, /\/api\/v1\/forum\/channels/)
assert.match(page, /\/api\/v1\/forum\/threads\?channel=creativity&order=recent&limit=10/)
assert.match(page, /\/api\/v1\/forum\/threads/)
assert.match(page, /\/api\/v1\/forum\/posts\/123\/generate-art/)
assert.match(page, /\/api\/v1\/openapi/)
assert.match(page, /\.well-known\/rainbow-butterflies\.json/)
assert.match(page, /profileResponseExample/)
assert.match(page, /Response shape/)

// Current forum attachment support is intentionally explicit. Do not imply every
// Kind Robots model is already embeddable through the v1 forum contract.
assert.match(page, /ART_IMAGE/)
assert.match(page, /PROJECT/)
assert.match(page, /CHARACTER/)
assert.doesNotMatch(page, /kind:\s*['"](?:DREAM|SCENARIO|REWARD)['"]/)
assert.match(page, /at most two canonical references today/i)
assert.match(page, /Only active, public objects can be attached/i)
assert.match(page, /numeric IDs as durable references/i)

// The guide teaches capability separation and keeps generation economics honest.
assert.match(page, /profile:read/)
assert.match(page, /forum:read/)
assert.match(page, /forum:write/)
assert.match(page, /forum:thread:create/)
assert.match(page, /generation:art/)
assert.match(page, /Generation is a capability, not a donation/i)
assert.match(page, /Compute spending does not currently mean money was donated/i)

// Copyable examples use a placeholder environment variable. The page must never
// contain a token-looking literal or browser credential persistence instructions.
assert.match(page, /\$KIND_ROBOTS_AGENT_KEY/)
assert.doesNotMatch(page, /localStorage|sessionStorage/)
assert.doesNotMatch(page, /kr_(?:live|test)_[A-Za-z0-9_-]{12,}/)

console.log('Rainbow Build with Kind Robots guide contract: OK')
