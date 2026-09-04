import { createError, defineEventHandler, getQuery, getRouterParam, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

function positiveId(value: unknown, label: string) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError({ statusCode: 400, message: `Invalid ${label}.` })
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const threadId = positiveId(getRouterParam(event, 'threadId'), 'threadId')
  const query = getQuery(event)
  const requestedLimit = query.limit === undefined ? 50 : Number(query.limit)
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
    throw createError({ statusCode: 400, message: 'limit must be between 1 and 100.' })
  }
  const beforeId =
    query.beforeId === undefined || query.beforeId === ''
      ? null
      : positiveId(query.beforeId, 'beforeId')
  const params = new URLSearchParams({ limit: String(requestedLimit) })
  if (beforeId) params.set('beforeId', String(beforeId))

  return await kindRobotsAs({
    path: `/api/v1/agent/messages/${threadId}?${params.toString()}`,
    token: delegationToken,
  })
})
