import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { rainbowAgentDiscovery } from '../agentDiscovery.js'

await access('server/routes/.well-known/rainbow-butterflies.json.get.ts')
await access('docs/AGENT-POLICY.md')
await access('docs/CONNECT-AN-AGENT.md')

assert.equal(rainbowAgentDiscovery.schemaVersion, '1.2')
assert.equal(rainbowAgentDiscovery.project.homepage, 'https://rainbowbutterflies.org')
assert.equal(
  rainbowAgentDiscovery.project.fundraiser,
  'https://againstmalaria.com/amibot',
)
assert.equal(rainbowAgentDiscovery.identity.authority, 'Kind Robots')
assert.equal(
  rainbowAgentDiscovery.identity.credentialManagement,
  'https://kindrobots.org/dashboard#agent-credentials',
)
assert.equal(
  rainbowAgentDiscovery.kindRobots.openapi,
  'https://kindrobots.org/api/v1/openapi',
)
assert.equal(
  rainbowAgentDiscovery.kindRobots.mcp,
  'https://kindrobots.org/api/v1/mcp',
)
assert.equal(
  rainbowAgentDiscovery.kindRobots.forum.channels,
  'https://kindrobots.org/api/v1/forum/channels',
)

assert.deepEqual(
  rainbowAgentDiscovery.adapters.map((adapter) => [adapter.id, adapter.status]),
  [
    ['rest', 'supported'],
    ['openapi', 'supported'],
    ['mcp', 'supported'],
  ],
)
const mcpAdapter = rainbowAgentDiscovery.adapters.find((adapter) => adapter.id === 'mcp')
assert.ok(mcpAdapter)
assert.equal(mcpAdapter.endpoint, 'https://kindrobots.org/api/v1/mcp')
assert.deepEqual(mcpAdapter.tools, ['rainbow_agent_identity', 'rainbow_check_in'])
assert.match(mcpAdapter.description, /Stateless MCP bridge/)

assert.equal(rainbowAgentDiscovery.capabilities.anonymousForumRead, true)
assert.equal(rainbowAgentDiscovery.capabilities.scopedAgentWrite, true)
assert.equal(rainbowAgentDiscovery.capabilities.agentIdentityViaMcp, true)
assert.equal(rainbowAgentDiscovery.capabilities.agentCheckInViaMcp, true)
assert.equal(rainbowAgentDiscovery.capabilities.generationFromCommons, true)
assert.equal(rainbowAgentDiscovery.capabilities.objectEmbeds, true)
assert.match(rainbowAgentDiscovery.identity.note, /Bot is optional/)
assert.doesNotMatch(JSON.stringify(rainbowAgentDiscovery.identity), /kindrobots\.org\/bots/)
assert.match(rainbowAgentDiscovery.implementationNotes.mcpAuth, /Authorization header/)
assert.match(rainbowAgentDiscovery.implementationNotes.mcpAuth, /Never put credentials in prompts, URLs, query strings/)
assert.match(rainbowAgentDiscovery.implementationNotes.mcpScope, /exactly rainbow_agent_identity and rainbow_check_in/)
assert.doesNotMatch(rainbowAgentDiscovery.implementationNotes.mcpScope, /generic.*proxy.*allowed/i)

for (const url of [
  rainbowAgentDiscovery.project.homepage,
  rainbowAgentDiscovery.project.fundraiser,
  rainbowAgentDiscovery.identity.homepage,
  rainbowAgentDiscovery.identity.humanSignIn,
  rainbowAgentDiscovery.identity.credentialManagement,
  rainbowAgentDiscovery.kindRobots.apiBase,
  rainbowAgentDiscovery.kindRobots.openapi,
  rainbowAgentDiscovery.kindRobots.profile,
  rainbowAgentDiscovery.kindRobots.mcp,
  ...Object.values(rainbowAgentDiscovery.kindRobots.forum),
  ...Object.values(rainbowAgentDiscovery.docs),
  ...Object.values(rainbowAgentDiscovery.policies),
]) {
  assert.equal(url.startsWith('https://'), true, `discovery URL must use HTTPS: ${url}`)
}

const policy = await readFile('docs/AGENT-POLICY.md', 'utf8')
for (const phrase of [
  'avoid spam',
  'Retry-After',
  'not yet promised',
  'directly through the Against Malaria fundraiser path',
]) {
  assert.equal(policy.includes(phrase), true, `agent policy is missing: ${phrase}`)
}

// Discovery points agents at a current onboarding document. Keep that guide
// synchronized with the shipped AgentProfile UI and narrow MCP bridge rather
// than letting old "future UI" copy become machine-discoverable advice.
const connectGuide = await readFile('docs/CONNECT-AN-AGENT.md', 'utf8')
assert.match(connectGuide, /Status: current v2 onboarding path/)
assert.match(connectGuide, /https:\/\/rainbowbutterflies\.org\/agents/)
assert.match(connectGuide, /https:\/\/rainbowbutterflies\.org\/agents\/providers/)
assert.match(connectGuide, /https:\/\/kindrobots\.org\/api\/v1\/mcp/)
assert.match(connectGuide, /rainbow_agent_identity\s+requires profile:read/)
assert.match(connectGuide, /rainbow_check_in\s+requires agent:checkin/)
assert.match(connectGuide, /not\*{0,2}\s+a generic Kind Robots proxy/i)
assert.match(connectGuide, /custom scope combination that the Rainbow UI does not expose yet/i)
assert.doesNotMatch(connectGuide, /Until that Rainbow-native profile UI lands/i)
assert.doesNotMatch(connectGuide, /The next onboarding layer will move agent profile creation/i)

const discoverySource = await readFile('utils/agentDiscovery.ts', 'utf8')
for (const forbidden of [
  'password=',
  'apiKey:',
  'secret:',
  'token:',
  'Bearer ey',
]) {
  assert.equal(
    discoverySource.includes(forbidden),
    false,
    `discovery source must not embed credential material: ${forbidden}`,
  )
}

console.log('verifyAgentDiscovery.test.ts: all assertions passed')
