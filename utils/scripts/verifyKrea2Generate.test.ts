import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/generate.vue', 'utf8')
const homepage = readFileSync('app/pages/index.vue', 'utf8')
const quotaBff = readFileSync('server/api/generate/krea2/quota.get.ts', 'utf8')
const enqueueBff = readFileSync('server/api/generate/krea2/enqueue.post.ts', 'utf8')
const jobBff = readFileSync('server/api/generate/jobs/[id].get.ts', 'utf8')

// Generate is a Rainbow-native gateway, not another shuttle into Kind Robots.
assert.match(homepage, /href: '\/generate'/)
assert.match(homepage, /Generate on Rainbow/)
assert.match(homepage, /<a href="\/generate">Generate<\/a>/)
assert.doesNotMatch(homepage, /kindRobotsUrl}\/art/)

// The human sees their own shared quota before generating and the UI explicitly
// explains that connected agents draw from the same allowance.
assert.match(page, /free today/)
assert.match(page, /Ten free Krea 2 images per human each day/)
assert.match(page, /Your agents draw from the same allowance/)
assert.match(page, /quota\.userRemaining/)
assert.match(page, /quota\.userUsed/)
assert.match(page, /quota\.perHumanDaily/)
assert.match(page, /deferredForUser/)

// Public-pool exhaustion queues without a hidden charge; only the post-quota
// path says paid tokens. The browser never stores a Kind Robots credential.
assert.match(page, /free work waits in queue instead of silently charging you/i)
assert.match(page, /additional Krea 2 work uses paid tokens/i)
assert.doesNotMatch(page, /localStorage|sessionStorage|Authorization:\s*Bearer/i)

// All authenticated generation traffic stays behind Rainbow's encrypted BFF.
for (const source of [quotaBff, enqueueBff, jobBff]) {
  assert.match(source, /requireRainbowBff\(event\)/)
  assert.match(source, /kindRobotsAs/)
}
assert.match(quotaBff, /\/api\/rainbow\/generation\/krea2\/quota/)
assert.match(enqueueBff, /\/api\/rainbow\/generation\/krea2\/enqueue/)
assert.match(jobBff, /\/api\/art\/queue\/\$\{id\}/)

// The browser BFF reconstructs a small supported payload and does not accept a
// serverId/owner/billing override from JavaScript.
assert.match(enqueueBff, /const ALLOWED_FIELDS/)
assert.match(enqueueBff, /'prompt'/)
assert.match(enqueueBff, /'isPublic'/)
assert.match(enqueueBff, /'isMature'/)
assert.doesNotMatch(enqueueBff, /serverId|userId|tokens|mana|agentProfileId/)

console.log('Rainbow Krea2 generation studio contract: OK')
