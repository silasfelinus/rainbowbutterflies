import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/agents/providers.vue', 'utf8')
const connectAgent = readFileSync('app/components/connect-agent.vue', 'utf8')

assert.match(connectAgent, /href="\/agents\/providers"/)
assert.match(page, /verified September 2, 2026/)
assert.match(page, /POST \/api\/v1\/agent\/check-in/)
assert.match(page, /agent:checkin/)
assert.match(page, /idle/)
assert.match(page, /working/)
assert.match(page, /blocked/)
assert.match(page, /completed/)
assert.match(page, /5,000 characters/)
assert.match(page, /human notes or resolved attention requests/i)

// Every promised provider has its own current, source-backed path.
for (const provider of ['ChatGPT', 'Claude', 'Gemini', 'Grok']) {
  assert.match(page, new RegExp(`name: '${provider}'`))
}
assert.match(page, /help\.openai\.com\/en\/articles\/10291617/)
assert.match(page, /platform\.claude\.com\/docs\/en\/managed-agents\/scheduled-deployments/)
assert.match(page, /platform\.claude\.com\/docs\/en\/managed-agents\/vaults/)
assert.match(page, /support\.google\.com\/gemini\/answer\/16316416/)
assert.match(page, /geminicli\.com\/docs\/tools\/mcp-server/)
assert.match(page, /docs\.x\.ai\/grok-bot\/skills-routines-and-automations/)
assert.match(page, /docs\.x\.ai\/grok\/connectors/)

// Consumer scheduling must not be overclaimed as secret-safe arbitrary REST.
assert.match(page, /ChatGPT[\s\S]*Bridge needed for unattended check-in/)
assert.match(page, /Gemini[\s\S]*Consumer scheduler needs a bridge/)
assert.match(page, /arbitrary bearer-authenticated HTTP writes/)
assert.match(page, /arbitrary bearer-token API execution.*not verified/is)

// Provider-native unattended paths that are documented must state their secret boundary.
assert.match(page, /Claude[\s\S]*Managed Agents \+ scheduled deployment \+ vault/)
assert.match(page, /opaque placeholder.*substituted only at egress/is)
assert.match(page, /Grok[\s\S]*Grok Bot routine \+ narrow custom MCP connector/)
assert.match(page, /server owns authentication rather than putting the AgentProfile key in Bot instructions/i)

// No real credential-shaped value, provider API key, or copied secret belongs in the guide.
assert.match(page, /\$KIND_ROBOTS_AGENT_KEY/)
assert.doesNotMatch(page, /Bearer\s+(?!\$KIND_ROBOTS_AGENT_KEY)[A-Za-z0-9_\-.]{12,}/)
assert.doesNotMatch(page, /sk-[A-Za-z0-9]{12,}|xai-[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,}/)
assert.match(page, /never in a prompt, screenshot, URL, analytics event, or committed file/i)

console.log('Rainbow recurring provider guides contract: OK')
