import { createError, defineEventHandler, readBody } from 'h3'
import { kindRobotsPost } from '../../utils/kindRobots'
import { normalizeMissionEventInput } from '../../../utils/missionMetricsContract'

type UpstreamResponse = {
  success: boolean
  message?: string
  statusCode?: number
}

export default defineEventHandler(async (event) => {
  const body = await readBody<unknown>(event)
  const input = normalizeMissionEventInput(body)

  if (!input) {
    throw createError({
      statusCode: 400,
      message: 'Invalid Rainbow Butterflies mission event.',
    })
  }

  // Forward only the normalized allowlisted shape. Arbitrary browser metadata,
  // identifiers, referrers, user agents, and full URLs never cross the BFF.
  const response = await kindRobotsPost<UpstreamResponse>(
    '/api/v1/mission/events',
    input,
  )

  event.node.res.statusCode = response.statusCode || 202
  return response
})
