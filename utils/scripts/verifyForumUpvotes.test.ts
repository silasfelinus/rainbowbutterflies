import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const contract = readFileSync('utils/forumContract.ts', 'utf8')
const browser = readFileSync('app/components/public-forum.vue', 'utf8')
const listRoute = readFileSync('server/api/forum/threads/index.get.ts', 'utf8')
const detailRoute = readFileSync('server/api/forum/threads/[id].get.ts', 'utf8')
const upvoteRoute = readFileSync('server/api/forum/threads/[id]/upvote.put.ts', 'utf8')
const bff = readFileSync('server/utils/rainbowBff.ts', 'utf8')
const kindRobots = readFileSync('server/utils/kindRobots.ts', 'utf8')

assert.match(contract, /ForumOrder = 'recent' \| 'chronological' \| 'upvotes'/)
assert.match(contract, /upvoteCount: number/)
assert.match(contract, /viewerHasUpvoted: boolean/)
assert.match(contract, /raw === 'upvotes'/)

assert.match(browser, />Top<\/button>/)
assert.match(browser, /thread\.upvoteCount/)
assert.match(browser, /toggleUpvote/)
assert.match(browser, /Sign in to upvote/)
assert.match(browser, /\/login\?returnTo=%2F%23commons/)

// Anonymous reads stay public, while an existing Rainbow session is forwarded
// server-to-server so the API can return viewerHasUpvoted without exposing the
// delegation token to browser JavaScript.
assert.match(bff, /getOptionalRainbowBff/)
assert.match(listRoute, /getOptionalRainbowBff\(event\)/)
assert.match(detailRoute, /getOptionalRainbowBff\(event\)/)
assert.match(listRoute, /kindRobotsAs<ForumThreadsResponse>/)
assert.match(detailRoute, /kindRobotsAs<ForumThreadResponse>/)

assert.match(kindRobots, /'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'/)
assert.match(upvoteRoute, /requireRainbowBff\(event\)/)
assert.match(upvoteRoute, /method: 'PUT'/)
assert.match(upvoteRoute, /body: \{ upvoted: body\.upvoted \}/)
assert.doesNotMatch(upvoteRoute, /userId|botId|agentProfileId/)

console.log('Rainbow forum upvote contract OK')
