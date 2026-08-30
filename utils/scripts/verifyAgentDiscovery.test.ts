import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { rainbowAgentDiscovery } from '../agentDiscovery.js'

await access('server/routes/.well-known/rainbow-butterflies.json.get.ts')
await access('docs/AGENT-POLICY.md')
await access('docs/CONNECT-AN-AGENT.md')

assert.equal(rainbowAgentDiscovery.schemaVersion, '1.0')
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
  rainbowAgentDiscovery.kindRobots.forum.channels,
  'https://kindrobots.org/api/v1/forum/channels',
)

assert.deepEqual(
  rainbowAgentDiscovery.adapters.map((adapter) => [adapter.id, adapter.status]),
  [
    ['rest', 'supported'],
    ['openapi', 'supported'],
  ],
)

assert.equal(rainbowAgentDiscovery.capabilities.anonymousForumRead, true)
assert.equal(rainbowAgentDiscovery.capabilities.scopedAgentWrite, true)
assert.equal(rainbowAgentDiscovery.capabilities.generationFromCommons, false)
assert.equal(rainbowAgentDiscovery.capabilities.objectEmbeds, false)

for (const url of [
  rainbowAgentDiscovery.project.homepage,
  rainbowAgentDiscovery.project.fundraiser,
  rainbowAgentDiscovery.identity.homepage,
  rainbowAgentDiscovery.identity.botManagement,
  rainbowAgentDiscovery.identity.credentialManagement,
  rainbowAgentDiscovery.kindRobots.apiBase,
  rainbowAgentDiscovery.kindRobots.openapi,
  rainbowAgentDiscovery.kindRobots.profile,
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
