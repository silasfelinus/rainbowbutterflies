import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const homepage = readFileSync('app/pages/index.vue', 'utf8')
const directory = readFileSync('app/pages/community.vue', 'utf8')
const humanPage = readFileSync('app/pages/community/humans/[id].vue', 'utf8')
const agentPage = readFileSync('app/pages/community/agents/[id].vue', 'utf8')
const publicList = readFileSync('server/api/community/index.get.ts', 'utf8')
const publicHuman = readFileSync('server/api/community/humans/[id].get.ts', 'utf8')
const publicAgent = readFileSync('server/api/community/agents/[id].get.ts', 'utf8')
const preferenceGet = readFileSync('server/api/community/preferences.get.ts', 'utf8')
const preferencePatch = readFileSync('server/api/community/preferences.patch.ts', 'utf8')
const profileGet = readFileSync('server/api/community/profile.get.ts', 'utf8')
const profilePatch = readFileSync('server/api/community/profile.patch.ts', 'utf8')

// Community is a first-class homepage gateway, not a secret route.
assert.match(homepage, /href: '\/community'/)
assert.match(homepage, />Community<\/a>/)
assert.match(homepage, /Meet the community/)

// Community is people/agents first, with declared identity and liaison context.
assert.match(directory, /Meet the humans and agents/)
assert.match(directory, /type-badge human/)
assert.match(directory, /type-badge agent/)
assert.match(directory, /human liaison private/i)
assert.match(directory, /\/community\/humans\/\$\{human\.id\}/)
assert.match(directory, /\/community\/agents\/\$\{agent\.id\}/)
assert.match(humanPage, /class="badge">Human/)
assert.match(humanPage, /public agent/)
assert.match(agentPage, /Declared AI identity/)
assert.match(agentPage, /human liaison private/i)

// Human discovery is explicit consent, never an implicit consequence of sign-in.
assert.match(directory, /List my human profile publicly/)
assert.match(directory, /Off by default/)
assert.match(directory, /isPublic/)
assert.match(directory, /\/api\/community\/preferences/)
assert.match(directory, /\/api\/community\/profile/)

// Public discovery BFF routes remain anonymous reads and only proxy fixed paths.
for (const source of [publicList, publicHuman, publicAgent]) {
  assert.match(source, /kindRobotsGet/)
  assert.doesNotMatch(source, /requireRainbowBff|authorization|Bearer/i)
}
assert.match(publicList, /\/api\/rainbow\/directory/)
assert.match(publicHuman, /\/api\/rainbow\/directory\/humans/)
assert.match(publicAgent, /\/api\/rainbow\/directory\/agents/)

// Settings/profile edits use only the encrypted human BFF delegation and a
// narrow browser field allowlist.
for (const source of [preferenceGet, preferencePatch, profileGet, profilePatch]) {
  assert.match(source, /requireRainbowBff\(event\)/)
  assert.match(source, /kindRobotsAs/)
  assert.doesNotMatch(source, /localStorage|sessionStorage/i)
}
assert.match(preferencePatch, /isPublic/)
assert.match(preferencePatch, /allowMessages/)
assert.match(profilePatch, /avatarImage/)
assert.match(profilePatch, /bio/)
assert.match(profilePatch, /designerName/)
assert.doesNotMatch(profilePatch, /email|password|apiKey|tokens|mana/)

console.log('Rainbow community directory contract: OK')
