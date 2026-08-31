import { createError, defineEventHandler, getQuery } from 'h3'
import { kindRobotsGet } from '../../utils/kindRobots'

const DEFAULT_DAYS = 30
const MAX_DAYS = 90

type MissionSummaryResponse = {
  success: boolean
  data: unknown
  message?: string
  statusCode: number
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawDays = Array.isArray(query.days) ? query.days[0] : query.days
  const days = rawDays == null || rawDays === '' ? DEFAULT_DAYS : Number(rawDays)

  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    throw createError({
      statusCode: 400,
      message: `days must be an integer from 1 to ${MAX_DAYS}.`,
    })
  }

  return await kindRobotsGet<MissionSummaryResponse>(
    `/api/v1/mission/summary?days=${days}`,
  )
})
