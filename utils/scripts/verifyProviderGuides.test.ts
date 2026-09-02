import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/agents/providers.vue', 'utf8')
const connectAgent = readFileSync('app/components/connect-agent.vue', 'utf8')

assert.match(connectAgent, /href="\/agents\/providers"/)
assert.match(page, /verified September 2, 2026/)
assert.match(page, /POST \/api\/v1\/agent\/check-in/)
assert.match(page, /https:\/\/kindrobots\.org\/api\/v1\/mcp/)
assert.match(page, /rainbow_agent_identity/)
assert.match(page, /rainbow_check_in/)
assert.match(page, /profile:read/)
assert.match(page, /agent:checkin/)
assert.match(page, /idle/)
assert.match(page, /working/)
assert.match(page, /blocked/)
assert.match(page, /completed/)
assert.match(page, /5,000 characters/)
assert.match(page, /human notes or resolved attention requests/i)
assert.match(page, /not a generic Kind Robots proxy/i)
assert.match(page, /cannot mint credentials, forward arbitrary HTTP, write to the forum, trigger generation, or execute arbitrary API routes/i)

// Every promised provider has its own current, source-backed path.
for (const provider of ['ChatGPT', 'Claude', 'Gemini', 'Grok']) {
  assert.match(page, new RegExp(`name: '${provider}'`))
}
assert.match(page, /help\.openai\.com\/en\/articles\/12584461/)
assert.match(page, /help\.openai\.com\/en\/articles\/10291617/)
assert.match(page, /platform\.claude\.com\/docs\/en\/managed-agents\/mcp-connector/)
assert.match(page, /platform\.claude\.com\/docs\/en\/managed-agents\/scheduled-deployments/)
assert.match(page, /support\.google\.com\/gemini\/answer\/16316416/)
assert.match(page, /geminicli\.com\/docs\/tools\/mcp-server/)
assert.match(page, /docs\.x\.ai\/grok-bot\/skills-routines-and-automations/)
assert.match(page, /docs\.x\.ai\/grok\/connectors/)

// ChatGPT full MCP writes are real on the documented workspace plans, but the
// guide must not invent the missing custom-MCP-to-Scheduled bridge.
assert.match(page, /ChatGPT[\s\S]*Business, Enterprise, and Edu/)
assert.match(page, /ChatGPT[\s\S]*custom MCP app pointed at https:\/\/kindrobots\.org\/api\/v1\/mcp/)
assert.match(page, /ChatGPT[\s\S]*Scheduled remains a separate boundary/)
assert.match(page, /does not explicitly promise that a custom full-MCP app is available for unattended Scheduled execution/i)
assert.match(page, /Agent mode also does not use custom apps/)

// Claude has a documented native unattended path using the real MCP endpoint,
// a static-bearer vault credential, and a scheduled deployment.
assert.match(page, /Claude[\s\S]*Managed Agents \+ Rainbow MCP \+ static-bearer vault \+ schedule/)
assert.match(page, /Claude[\s\S]*static_bearer credential/)
assert.match(page, /Claude[\s\S]*mcp_server_url matches the Rainbow MCP endpoint/)
assert.match(page, /Claude[\s\S]*scheduled deployment/)
assert.match(page, /separates the MCP server declaration from session authentication/i)

// Gemini CLI can be a direct MCP client, while Gemini Apps Scheduled remains
// a distinct consumer surface until Google documents the connection.
assert.match(page, /Gemini[\s\S]*HTTP MCP server/)
assert.match(page, /Gemini[\s\S]*Authorization header/)
assert.match(page, /Gemini[\s\S]*includeTools/)
assert.match(page, /Gemini[\s\S]*trust disabled/)
assert.match(page, /Gemini[\s\S]*consumer scheduler and the secret-bearing CLI\/MCP runtime as separate boundaries/)

// Grok can discover the public MCP server, but authentication support is stated
// conditionally because xAI does not promise every credential shape.
assert.match(page, /Grok[\s\S]*https:\/\/kindrobots\.org\/api\/v1\/mcp as a custom Grok MCP connector/)
assert.match(page, /Grok[\s\S]*if your Grok account’s custom-connector flow can send the AgentProfile bearer credential/i)
assert.match(page, /xAI documents required authentication for custom MCP connectors but does not make every credential shape a universal promise/i)

// No real credential-shaped value, provider API key, or copied secret belongs in the guide.
assert.match(page, /\$KIND_ROBOTS_AGENT_KEY/)
assert.doesNotMatch(page, /Bearer\s+(?!\$KIND_ROBOTS_AGENT_KEY)[A-Za-z0-9_\-.]{12,}/)
assert.doesNotMatch(page, /sk-[A-Za-z0-9]{12,}|xai-[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,}/)
assert.match(page, /never in a prompt, screenshot, URL, analytics event, or committed file/i)

console.log('Rainbow recurring provider guides contract: OK')
