// Boot the built Nitro output and prove every shipped route serves its own page.
//
// Every other Rainbow contract reads source files, so a routing regression that
// ships the wrong page is invisible to them: on 2026-09-04 the acceptance pass
// found that app/pages/agents.vue and community.vue had nested their child routes
// without a NuxtPage, and /agents/providers, /agents/messaging, /agents/:id and
// both community profile routes had served the parent page from the day they
// merged. Text contracts stayed green the whole time. This probe would have failed
// on the first push.
//
// Two checks, both against the real production bundle:
//   1. Every route returns the expected status and contains a marker string that
//      only its own page renders (signed-out states, so no credential is needed).
//   2. With Playwright, no route produces horizontal page overflow at phone,
//      tablet or desktop width. PRODUCT-V2 calls mobile correctness a correctness
//      requirement; this is the same measurement the acceptance pass used.
//
// Usage:
//   node utils/scripts/probeRoutes.mjs                 # boots .output on a free port
//   PROBE_BASE=http://localhost:3100 node utils/scripts/probeRoutes.mjs   # existing server
//   PROBE_SKIP_BROWSER=1 node utils/scripts/probeRoutes.mjs              # markers only

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { setTimeout as sleep } from 'node:timers/promises'

const ROUTES = [
  { path: '/', marker: 'Humans and AI working together' },
  { path: '/login', marker: 'Join the commons.' },
  { path: '/agents', marker: 'Connect an AI agent.' },
  { path: '/agents/providers', marker: 'Give your agent a heartbeat' },
  { path: '/agents/messaging', marker: 'Reply access is a separate permission.' },
  { path: '/agents/1', marker: 'Sign in to see agent activity' },
  { path: '/community', marker: 'Meet the humans and agents.' },
  { path: '/community/agents/999999', marker: 'That agent isn' },
  { path: '/community/humans/999999', marker: 'That profile isn' },
  { path: '/dashboard', marker: 'Your human + AI workspace.' },
  { path: '/messages', marker: 'Small, private, optional.' },
  { path: '/servers', marker: 'Bring your own pixels.' },
  { path: '/notifications', marker: 'Choose what is worth interrupting you for.' },
  { path: '/generate', marker: 'Make something useful, strange, or beautiful.' },
  { path: '/build', marker: 'One backend.' },
  { path: '/economy', marker: 'Make the money claims' },
  { path: '/mission', marker: 'to make a better world.' },
  { path: '/privacy', marker: 'Small footprints, useful data.' },
  { path: '/terms', marker: 'Build kindly. Stay accountable.' },
  { path: '/api/health', marker: '"ok":true' },
  { path: '/definitely-not-a-route', marker: '404', status: 404 },
]

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 },
]

const failures = []

function fail(message) {
  failures.push(message)
  console.error(`FAIL ${message}`)
}

async function waitForHealth(base, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/health`)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await sleep(500)
  }
  throw new Error(`server at ${base} did not answer /api/health within ${timeoutMs}ms`)
}

async function bootServer() {
  if (!existsSync('.output/server/index.mjs')) {
    throw new Error('.output/server/index.mjs is missing; run `npm run build` first')
  }
  const port = 3000 + Math.floor(Math.random() * 2000) + 100
  const child = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), NITRO_PORT: String(port), HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let log = ''
  child.stdout.on('data', (chunk) => { log += chunk })
  child.stderr.on('data', (chunk) => { log += chunk })
  const base = `http://127.0.0.1:${port}`
  try {
    await waitForHealth(base, 30000)
  } catch (error) {
    child.kill('SIGTERM')
    console.error(log)
    throw error
  }
  return { base, stop: () => child.kill('SIGTERM') }
}

async function probeMarkers(base) {
  for (const route of ROUTES) {
    const expected = route.status ?? 200
    let response
    try {
      response = await fetch(`${base}${route.path}`, { redirect: 'manual' })
    } catch (error) {
      fail(`${route.path}: request failed (${error})`)
      continue
    }
    const body = await response.text()
    if (response.status !== expected) {
      fail(`${route.path}: expected HTTP ${expected}, got ${response.status}`)
      continue
    }
    if (!body.includes(route.marker)) {
      const h1 = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '').trim().slice(0, 80)
      fail(`${route.path}: marker ${JSON.stringify(route.marker)} not in response (first h1: ${JSON.stringify(h1 ?? null)})`)
      continue
    }
    console.log(`ok ${response.status} ${route.path}`)
  }
}

async function probeWidths(base) {
  const require = createRequire(import.meta.url)
  let chromium
  try {
    ;({ chromium } = require('playwright'))
  } catch {
    fail('playwright is not installed; run `npx playwright install --with-deps chromium` or set PROBE_SKIP_BROWSER=1')
    return
  }
  const browser = await chromium.launch({
    executablePath: process.env.PROBE_CHROMIUM || undefined,
    args: ['--no-sandbox'],
  })
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.width < 500, hasTouch: viewport.width < 900 })
      for (const route of ROUTES) {
        if (route.path.startsWith('/api/') || route.status === 404) continue
        const page = await context.newPage()
        try {
          await page.goto(`${base}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 })
          await page.waitForTimeout(300)
          const overflow = await page.evaluate(() => {
            const root = document.documentElement
            return Math.max(root.scrollWidth, document.body.scrollWidth) - window.innerWidth
          })
          if (overflow > 0) {
            fail(`${route.path} @ ${viewport.name} (${viewport.width}px): page is ${overflow}px wider than the viewport`)
          } else {
            console.log(`ok width ${viewport.name.padEnd(7)} ${route.path}`)
          }
        } catch (error) {
          fail(`${route.path} @ ${viewport.name}: ${String(error).split('\n')[0]}`)
        } finally {
          await page.close()
        }
      }
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  let stop = () => {}
  let base = process.env.PROBE_BASE
  if (!base) {
    const server = await bootServer()
    base = server.base
    stop = server.stop
  }
  try {
    await probeMarkers(base)
    if (process.env.PROBE_SKIP_BROWSER !== '1') {
      await probeWidths(base)
    }
  } finally {
    stop()
  }
  if (failures.length) {
    console.error(`\n${failures.length} route probe failure(s)`)
    process.exit(1)
  }
  console.log(`\nRoute probe passed: ${ROUTES.length} routes, ${process.env.PROBE_SKIP_BROWSER === '1' ? 'markers only' : `${VIEWPORTS.length} widths`}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
