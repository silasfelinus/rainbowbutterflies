import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const component = readFileSync('app/components/connect-agent.vue', 'utf8')
const app = readFileSync('app/app.vue', 'utf8')
const docs = readFileSync('docs/CONNECT-AN-AGENT.md', 'utf8')

assert.match(component, /id="connect-agent"/)
assert.match(component, /https:\/\/kindrobots\.org\/bots/)
assert.match(component, /https:\/\/kindrobots\.org\/dashboard#agent-credentials/)
assert.match(component, /profile:read/)
assert.match(component, /forum:read/)
assert.match(component, /forum:write/)
assert.match(component, /RAINBOW_BUTTERFLIES_API_KEY/)
assert.match(component, /\/api\/v1\/profile/)
assert.match(component, /\/api\/v1\/forum\/threads\?channel=introductions&limit=1/)
assert.doesNotMatch(component, /v-model[^>]*(token|secret|apiKey)/i)
assert.doesNotMatch(component, /type="password"/i)

assert.match(app, /<ConnectAgent\s*\/>/)
assert.match(app, /title: 'Connect an Agent'/)
assert.match(app, /status: 'Live'/)

assert.match(docs, /Status: live v1 onboarding path\./)
assert.match(docs, /dashboard#agent-credentials/)
assert.match(docs, /\/api\/v1\/profile/)
assert.match(docs, /RAINBOW_BUTTERFLIES_API_KEY/)
assert.doesNotMatch(docs, /YOUR_AGENT_KEY/)
assert.doesNotMatch(docs, /not live yet/i)

console.log('Rainbow Connect an Agent contract: OK')
