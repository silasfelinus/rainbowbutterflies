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

const SEEN_KEY = 'rb_seen'
const VISIT_DAY_KEY = 'rb_visit_day'
const ATTRIBUTION_KEY = 'rb_attribution'
const ATTRIBUTION_DAYS = 30

type StoredAttribution = {
  source: MissionSource
  campaign: MissionCampaign
  expiresDay: string
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function utcDayOffset(days: number): string {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function storedAttribution(): {
  source: MissionSource
  campaign: MissionCampaign
} | null {
  const raw = readStorage(ATTRIBUTION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAttribution>
    const today = new Date().toISOString().slice(0, 10)
    if (!parsed.expiresDay || parsed.expiresDay < today) return null

    return {
      source: normalizeMissionSource(parsed.source),
      campaign: normalizeMissionCampaign(parsed.campaign),
    }
  } catch {
    return null
  }
}

function saveAttribution(source: MissionSource, campaign: MissionCampaign): void {
  const row: StoredAttribution = {
    source: normalizeMissionSource(source),
    campaign: normalizeMissionCampaign(campaign),
    expiresDay: utcDayOffset(ATTRIBUTION_DAYS),
  }
  writeStorage(ATTRIBUTION_KEY, JSON.stringify(row))
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
  const seenBefore = readStorage(SEEN_KEY) === '1'
  const lastCountedDay = readStorage(VISIT_DAY_KEY)

  if (lastCountedDay !== today) {
    writeStorage(SEEN_KEY, '1')
    writeStorage(VISIT_DAY_KEY, today)
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
