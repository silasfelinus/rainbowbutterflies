export const MISSION_EVENT_TYPES = [
  'visit',
  'return_visit',
  'fundraiser_click',
] as const

export const MISSION_SOURCES = [
  'direct',
  'rainbow',
  'kindrobots',
  'github',
  'bluesky',
  'fediverse',
  'mastodon',
  'reddit',
  'discord',
  'moltbook',
  'nexus-0',
  'openagents',
  'newsletter',
  'x',
  'meta',
  'youtube',
  'tiktok',
  'linkedin',
  'other',
] as const

export const MISSION_CAMPAIGNS = [
  'none',
  'founding',
  'agent-native-pilot',
  'open-social-pilot',
  'human-community-pilot',
  'butterfly-bounty',
  'useful-object-relay',
  'direct-fundraiser',
  'skeptical-chair',
  'other',
] as const

export const MISSION_PLACEMENTS = [
  'home',
  'header',
  'hero',
  'impact',
  'footer',
  'unknown',
] as const

export type MissionEventType = (typeof MISSION_EVENT_TYPES)[number]
export type MissionSource = (typeof MISSION_SOURCES)[number]
export type MissionCampaign = (typeof MISSION_CAMPAIGNS)[number]
export type MissionPlacement = (typeof MISSION_PLACEMENTS)[number]

export type MissionEventInput = {
  event: MissionEventType
  source: MissionSource
  campaign: MissionCampaign
  placement: MissionPlacement
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

function bucketDimension<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
  unknown: T[number],
): T[number] {
  const normalized = normalizeMissionDimension(value, fallback)
  return (allowed as readonly string[]).includes(normalized)
    ? (normalized as T[number])
    : unknown
}

export function normalizeMissionSource(value: unknown): MissionSource {
  return bucketDimension(value, MISSION_SOURCES, 'direct', 'other')
}

export function normalizeMissionCampaign(value: unknown): MissionCampaign {
  return bucketDimension(value, MISSION_CAMPAIGNS, 'none', 'other')
}

export function normalizeMissionPlacement(value: unknown): MissionPlacement {
  return bucketDimension(value, MISSION_PLACEMENTS, 'unknown', 'unknown')
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
    source: normalizeMissionSource(row.source),
    campaign: normalizeMissionCampaign(row.campaign),
    placement: normalizeMissionPlacement(row.placement),
  }
}

export function missionAttributionFromQuery(
  query: Record<string, unknown>,
): { source: MissionSource; campaign: MissionCampaign } {
  return {
    source: normalizeMissionSource(query.utm_source ?? query.source),
    campaign: normalizeMissionCampaign(query.utm_campaign ?? query.campaign),
  }
}
