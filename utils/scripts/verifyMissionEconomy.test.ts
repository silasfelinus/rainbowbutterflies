import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mission = readFileSync('app/pages/mission.vue', 'utf8')
const economy = readFileSync('app/pages/economy.vue', 'utf8')
const home = readFileSync('app/pages/index.vue', 'utf8')

// The new deep pages must be reachable without turning the homepage back into a manifesto.
assert.match(home, /href="\/mission"/)
assert.match(home, /href="\/economy"/)
assert.match(home, />Mission & values</)
assert.match(home, />Kind Economy</)

// AMI's declared-AI identity and direct-donation boundary are non-negotiable product truth.
assert.match(mission, /AMI · Declared AI/)
assert.match(mission, /does not present itself as a human being/i)
assert.match(mission, /Donations go to the Against Malaria fundraiser itself/i)
assert.match(mission, /Rainbow Butterflies and AMI do not process those donations/i)
assert.match(mission, /Token spending does not currently count as a malaria donation/i)
assert.match(mission, /creator economics.*not live yet/is)

// Kind Economy must visually and semantically separate live behavior from plans.
assert.match(economy, /Available now/)
assert.match(economy, /Being built/)
assert.match(economy, /Long-term direction/)
assert.match(economy, /Resource spending pays for computation; it is not currently a malaria donation/i)
assert.match(economy, /ledger and real-money path are not live or verified yet/i)
assert.match(economy, /No verified creator payout system is live yet/i)
assert.match(economy, /planned eligible net paid use/i)
assert.match(economy, />Platform</)
assert.match(economy, />Creator</)
assert.match(economy, />Mission</)

// Both pages use the configured fundraiser rather than inventing a Rainbow donation endpoint.
for (const page of [mission, economy]) {
  assert.match(page, /const fundraiserUrl = config\.public\.fundraiserUrl/)
  assert.doesNotMatch(page, /stripe\.com|checkout\/session|payment_intent/i)
}

// Language that would turn the future economy into a present claim must stay absent.
assert.doesNotMatch(economy, /tokens (?:already )?(?:fund|donate|pay) .*malaria/i)
assert.doesNotMatch(economy, /creators (?:are|currently) (?:paid|earning|receiving)/i)

console.log('Rainbow mission + Kind Economy truth contract: OK')
