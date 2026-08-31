export const MISSION_EVENT_TYPES = [
  'visit',
  'return_visit',
  'fundraiser_click',
] as const

export type MissionEventType = (typeof MISSION_EVENT_TYPES)[number]

export type MissionEventInput = {
  event: MissionEventType
  source: string
  campaign: string
  placement: string
}

const DIMENSION_MAX_LENGTH = 48

export function normalizeMissionDimension(value: unknown, fallback: string): string {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string') return fallback

  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, DIMENSION_MAX_LENGTH)
    .replace(/-+$/g, '')

  return normalized || fallback
}

export function normalizeMissionEventInput(value: unknown): MissionEventInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>

  if (
    typeof row.event !== 'string' ||
    !(MISSION_EVENT_TYPES as readonly string[]).includes(row.event)
  ) {
    return null
  }

  return {
    event: row.event as MissionEventType,
    source: normalizeMissionDimension(row.source, 'direct'),
    campaign: normalizeMissionDimension(row.campaign, 'none'),
    placement: normalizeMissionDimension(row.placement, 'unknown'),
  }
}

export function missionAttributionFromQuery(
  query: Record<string, unknown>,
): { source: string; campaign: string } {
  return {
    source: normalizeMissionDimension(
      query.utm_source ?? query.source,
      'direct',
    ),
    campaign: normalizeMissionDimension(
      query.utm_campaign ?? query.campaign,
      'none',
    ),
  }
}
