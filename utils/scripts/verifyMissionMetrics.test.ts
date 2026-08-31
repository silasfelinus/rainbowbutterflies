import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  missionAttributionFromQuery,
  normalizeMissionDimension,
  normalizeMissionEventInput,
} from '../missionMetricsContract.js'

assert.equal(normalizeMissionDimension(' Bluesky / Launch ', 'direct'), 'bluesky-launch')
assert.deepEqual(
  missionAttributionFromQuery({
    utm_source: 'Bluesky',
    utm_campaign: 'Launch Week 1',
  }),
  { source: 'bluesky', campaign: 'launch-week-1' },
)
assert.deepEqual(missionAttributionFromQuery({}), {
  source: 'direct',
  campaign: 'none',
})
assert.deepEqual(
  normalizeMissionEventInput({
    event: 'fundraiser_click',
    source: 'Newsletter',
    campaign: 'Butterfly Bounty',
    placement: 'Hero CTA',
    visitorId: 'must-never-forward',
  }),
  {
    event: 'fundraiser_click',
    source: 'newsletter',
    campaign: 'butterfly-bounty',
    placement: 'hero-cta',
  },
)

const [pluginSource, bffSource, summarySource] = await Promise.all([
  readFile('app/plugins/mission-metrics.client.ts', 'utf8'),
  readFile('server/api/mission/event.post.ts', 'utf8'),
  readFile('server/api/mission/summary.get.ts', 'utf8'),
])

assert.match(pluginSource, /const SEEN_COOKIE = 'rb_seen'/)
assert.match(pluginSource, /const VISIT_DAY_COOKIE = 'rb_visit_day'/)
assert.match(pluginSource, /navigator\.sendBeacon/)
assert.match(pluginSource, /fundraiser_click/)
assert.doesNotMatch(pluginSource, /document\.referrer|navigator\.userAgent|fingerprint|crypto\.randomUUID/i)
assert.doesNotMatch(pluginSource, /visitorId|userId|sessionId/i)

assert.match(bffSource, /normalizeMissionEventInput/)
assert.match(bffSource, /Forward only the normalized allowlisted shape/)
assert.doesNotMatch(bffSource, /getHeader\(|getCookie\(|authorization\s*:/i)
assert.match(summarySource, /days must be an integer from 1 to/)

console.log('Rainbow mission metrics contract: OK')
