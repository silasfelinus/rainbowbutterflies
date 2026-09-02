import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const page = readFileSync('app/pages/notifications.vue', 'utf8')
const identity = readFileSync('app/components/identity-control.vue', 'utf8')
const preferenceGet = readFileSync('server/api/notifications/preferences.get.ts', 'utf8')
const preferencePatch = readFileSync('server/api/notifications/preferences.patch.ts', 'utf8')

// Notification settings are discoverable from the signed-in account control.
assert.match(identity, /href="\/notifications"/)
assert.match(page, /Notification settings/)
assert.match(page, /Everything starts off/)
assert.match(page, /No existing account is subscribed automatically/)

// The UI owns exactly the three deliberately small v2 notification classes.
for (const field of ['agentAttention', 'forumReplyMention', 'scheduledAgentFailure']) {
  assert.match(page, new RegExp(`preference\\.${field}`))
  assert.match(preferencePatch, new RegExp(`body\\.${field}`))
}
assert.match(page, /Agent asks for your attention/)
assert.match(page, /Direct forum replies or mentions/)
assert.match(page, /Scheduled agent failure/)

// Browser traffic stays behind Rainbow's encrypted BFF delegation and may not
// nominate another user or smuggle extra delivery fields through.
for (const route of [preferenceGet, preferencePatch]) {
  assert.match(route, /requireRainbowBff\(event\)/)
  assert.match(route, /kindRobotsAs/)
  assert.match(route, /\/api\/rainbow\/notifications\/preferences/)
  assert.doesNotMatch(route, /userId|email|transport|provider/)
}
assert.match(preferencePatch, /method: 'PATCH'/)
assert.match(preferencePatch, /requiredBoolean/)

// t-048 stores opt-ins only. External delivery and provider secrets remain t-049.
for (const source of [page, preferenceGet, preferencePatch]) {
  assert.doesNotMatch(source, /BREVO_API_KEY|api\.brevo\.com|sendTransactionalEmail/)
}
assert.match(page, /External email delivery is not active in this task/)
assert.match(page, /no Brevo message is sent/i)
assert.match(page, /Website state is the authority/)

console.log('Rainbow notification settings contract: OK')
