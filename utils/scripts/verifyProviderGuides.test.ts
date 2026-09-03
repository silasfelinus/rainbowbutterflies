import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/agents/providers.vue', 'utf8')
const component = readFileSync('app/components/provider-guides-content.vue', 'utf8')
const data = readFileSync('app/data/providerGuides.ts', 'utf8')
const connectAgent = readFileSync('app/components/connect-agent.vue', 'utf8')
const guide = `${page}\n${component}\n${data}`

assert.match(connectAgent, /href="\/agents\/providers"/)
assert.match(page, /<ProviderGuidesContent \/>/)
assert.match(component, /verified September 2, 2026/)
assert.match(guide, /POST \/api\/v1\/agent\/check-in/)
assert.match(guide, /https:\/\/kindrobots\.org\/api\/v1\/mcp/)
assert.match(guide, /rainbow_agent_identity/)
assert.match(guide, /rainbow_check_in/)
assert.match(guide, /profile:read/)
assert.match(guide, /agent:checkin/)
assert.match(guide, /idle/)
assert.match(guide, /working/)
assert.match(guide, /blocked/)
assert.match(guide, /completed/)
assert.match(guide, /5,000 characters/)
assert.match(guide, /human notes or resolved attention requests/i)
assert.match(guide, /not a generic Kind Robots proxy/i)
assert.match(
  guide,
  /cannot mint credentials, forward arbitrary HTTP, write to the forum, trigger generation, or execute arbitrary API routes/i,
)

// Every promised provider has its own current, source-backed path.
for (const provider of ['ChatGPT', 'Claude', 'Gemini', 'Grok']) {
  assert.match(data, new RegExp(`name: '${provider}'`))
}
assert.match(data, /help\.openai\.com\/en\/articles\/12584461/)
assert.match(data, /help\.openai\.com\/en\/articles\/10291617-scheduled-tasks-in-chatgpt/)
assert.match(data, /platform\.claude\.com\/docs\/en\/managed-agents\/mcp-connector/)
assert.match(data, /platform\.claude\.com\/docs\/en\/managed-agents\/scheduled-deployments/)
assert.match(data, /support\.google\.com\/gemini\/answer\/16316416/)
assert.match(data, /geminicli\.com\/docs\/tools\/mcp-server/)
assert.match(data, /docs\.x\.ai\/grok-bot\/skills-routines-and-automations/)
assert.match(data, /docs\.x\.ai\/grok\/connectors/)

// The walkthroughs are durable, provider-neutral setup diagrams rather than
// copied third-party screenshots whose UI can drift independently of the guide.
assert.match(component, /provider-neutral diagrams, not copied screenshots/i)
assert.match(component, /provider\.visualPath/)
assert.match(component, /class="setup-map"/)
assert.match(component, /class="setup-stage"/)
assert.match(component, /grid-template-columns:repeat\(5/)
assert.match(component, /@media\(max-width:640px\)[\s\S]*\.setup-map\{grid-template-columns:1fr\}/)
for (const provider of ['chatgpt', 'claude', 'gemini', 'grok']) {
  const block = data.match(new RegExp(`id: '${provider}'[\\s\\S]*?(?=\\n  \\{\\n    id: '|\\n\\])`))?.[0] ?? ''
  assert.match(block, /visualPath:\s*\[/)
  assert.ok((block.match(/\{ label:/g) ?? []).length >= 5, `${provider} needs a five-stage setup map`)
}

// ChatGPT full MCP writes are real on the documented workspace plans, but the
// guide must not invent the missing custom-MCP-to-Scheduled bridge.
assert.match(data, /ChatGPT[\s\S]*Business, Enterprise, and Edu/)
assert.match(data, /ChatGPT[\s\S]*custom MCP app pointed at https:\/\/kindrobots\.org\/api\/v1\/mcp/)
assert.match(data, /ChatGPT[\s\S]*Scheduled remains a separate boundary/)
assert.match(data, /does not explicitly promise that a custom full-MCP app is available for unattended Scheduled execution/i)
assert.match(data, /Agent mode also does not use custom apps/)

// Claude has a documented native unattended path using the real MCP endpoint,
// a static-bearer vault credential, and a scheduled deployment.
assert.match(data, /Claude[\s\S]*Managed Agents \+ Rainbow MCP \+ static-bearer vault \+ schedule/)
assert.match(data, /Claude[\s\S]*static_bearer credential/)
assert.match(data, /Claude[\s\S]*mcp_server_url matches the Rainbow MCP endpoint/)
assert.match(data, /Claude[\s\S]*scheduled deployment/)
assert.match(data, /separates the MCP server declaration from session authentication/i)

// Gemini CLI can be a direct MCP client, while Gemini Apps Scheduled remains
// a distinct consumer surface until Google documents the connection.
assert.match(data, /Gemini[\s\S]*HTTP MCP server/)
assert.match(data, /Gemini[\s\S]*Authorization header/)
assert.match(data, /Gemini[\s\S]*includeTools/)
assert.match(data, /Gemini[\s\S]*trust disabled/)
assert.match(data, /Gemini[\s\S]*consumer scheduler and the secret-bearing CLI\/MCP runtime as separate boundaries/)

// Grok can discover the public MCP server, but authentication support is stated
// conditionally because xAI does not promise every credential shape.
assert.match(data, /Grok[\s\S]*https:\/\/kindrobots\.org\/api\/v1\/mcp as a custom Grok MCP connector/)
assert.match(data, /Grok[\s\S]*if your Grok account’s custom-connector flow can send the AgentProfile bearer credential/i)
assert.match(data, /xAI documents required authentication for custom MCP connectors but does not make every credential shape a universal promise/i)

// No real credential-shaped value, provider API key, or copied secret belongs in the guide.
assert.match(guide, /\$KIND_ROBOTS_AGENT_KEY/)
assert.doesNotMatch(guide, /Bearer\s+(?!\$KIND_ROBOTS_AGENT_KEY)[A-Za-z0-9_\-.]{12,}/)
assert.doesNotMatch(guide, /sk-[A-Za-z0-9]{12,}|xai-[A-Za-z0-9]{12,}|AIza[A-Za-z0-9_-]{20,}/)
assert.match(guide, /never in a prompt, screenshot, URL, analytics event, or committed file/i)

console.log('Rainbow recurring provider guides contract: OK')
