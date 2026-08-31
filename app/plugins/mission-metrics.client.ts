import { defineNuxtPlugin, useRoute, useRuntimeConfig } from '#imports'
import {
  missionAttributionFromQuery,
  normalizeMissionCampaign,
  normalizeMissionPlacement,
  normalizeMissionSource,
  type MissionCampaign,
  type MissionEventInput,
  type MissionEventType,
  type MissionSource,
} from '~~/utils/missionMetricsContract'

const SEEN_COOKIE = 'rb_seen'
const VISIT_DAY_COOKIE = 'rb_visit_day'
const ATTRIBUTION_COOKIE = 'rb_attribution'
const YEAR_SECONDS = 365 * 24 * 60 * 60
const ATTRIBUTION_SECONDS = 30 * 24 * 60 * 60

function readCookie(name: string): string | null {
  const prefix = `${name}=`
  const row = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix))

  if (!row) return null
  try {
    return decodeURIComponent(row.slice(prefix.length))
  } catch {
    return null
  }
}

function writeCookie(name: string, value: string, maxAge: number): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

function storedAttribution(): {
  source: MissionSource
  campaign: MissionCampaign
} | null {
  const raw = readCookie(ATTRIBUTION_COOKIE)
  if (!raw) return null
  const [source, campaign] = raw.split('|')
  if (!source || !campaign) return null
  return {
    source: normalizeMissionSource(source),
    campaign: normalizeMissionCampaign(campaign),
  }
}

function saveAttribution(source: MissionSource, campaign: MissionCampaign): void {
  writeCookie(
    ATTRIBUTION_COOKIE,
    `${normalizeMissionSource(source)}|${normalizeMissionCampaign(campaign)}`,
    ATTRIBUTION_SECONDS,
  )
}

function placementForAnchor(anchor: HTMLAnchorElement): string {
  if (anchor.closest('.site-header')) return 'header'
  if (anchor.closest('.hero')) return 'hero'
  if (anchor.closest('.impact-panel')) return 'impact'
  if (anchor.closest('.site-footer')) return 'footer'
  return 'unknown'
}

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const fundraiserUrl = new URL(config.public.fundraiserUrl as string)

  function attribution() {
    const fromQuery = missionAttributionFromQuery(
      route.query as Record<string, unknown>,
    )
    const hasCampaignAttribution =
      fromQuery.source !== 'direct' || fromQuery.campaign !== 'none'

    if (hasCampaignAttribution) {
      saveAttribution(fromQuery.source, fromQuery.campaign)
      return fromQuery
    }

    return storedAttribution() ?? fromQuery
  }

  function emit(event: MissionEventType, placement = 'unknown'): void {
    const { source, campaign } = attribution()
    const body: MissionEventInput = {
      event,
      source,
      campaign,
      placement: normalizeMissionPlacement(placement),
    }
    const payload = JSON.stringify(body)

    if (typeof navigator.sendBeacon === 'function') {
      const accepted = navigator.sendBeacon(
        '/api/mission/event',
        new Blob([payload], { type: 'application/json' }),
      )
      if (accepted) return
    }

    void fetch('/api/mission/event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => undefined)
  }

  const today = new Date().toISOString().slice(0, 10)
  const seenBefore = readCookie(SEEN_COOKIE) === '1'
  const lastCountedDay = readCookie(VISIT_DAY_COOKIE)

  if (lastCountedDay !== today) {
    writeCookie(SEEN_COOKIE, '1', YEAR_SECONDS)
    writeCookie(VISIT_DAY_COOKIE, today, YEAR_SECONDS)
    emit(seenBefore ? 'return_visit' : 'visit', 'home')
  }

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      let destination: URL
      try {
        destination = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      if (
        destination.origin !== fundraiserUrl.origin ||
        destination.pathname.replace(/\/$/, '') !==
          fundraiserUrl.pathname.replace(/\/$/, '')
      ) {
        return
      }

      emit('fundraiser_click', placementForAnchor(anchor))
    },
    { capture: true },
  )
})
