import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/servers.vue', 'utf8')
const boundary = readFileSync('server/utils/generatorServers.ts', 'utf8')
const listRoute = readFileSync('server/api/servers/index.get.ts', 'utf8')
const createRoute = readFileSync('server/api/servers/index.post.ts', 'utf8')
const updateRoute = readFileSync('server/api/servers/[id].patch.ts', 'utf8')
const deleteRoute = readFileSync('server/api/servers/[id].delete.ts', 'utf8')

for (const source of [listRoute, createRoute, updateRoute, deleteRoute]) {
  assert.match(source, /requireRainbowBff\(event\)/)
  assert.match(source, /kindRobotsAs/)
}

assert.match(createRoute, /buildRainbowServerCreate/)
assert.match(updateRoute, /buildRainbowServerUpdate/)
assert.match(boundary, /const createFields = new Set/)
assert.doesNotMatch(boundary.match(/const createFields[\s\S]*?\]\)/)?.[0] ?? '', /userId|isOfficial|isDefault|isEditable/)
assert.match(boundary, /isPublic: input\.isPublic === true/)
assert.match(boundary, /const \{ apiKey: _apiKey, \.\.\.safe \} = server/)
assert.match(boundary, /hasApiKey: server\.hasApiKey === true/)

assert.match(page, /const isPublic = ref\(false\)/)
assert.match(page, /no Rainbow or Kind Robots generation-token charge/)
assert.match(page, /Public, non-official servers are currently free for other users/)
assert.match(page, /Write-only\. Rainbow will not show the stored value again/)
assert.match(page, /@media \(max-width: 560px\)/)
assert.doesNotMatch(page, /v-model="server\.apiKey"/)

console.log('Rainbow generator server contract OK')
