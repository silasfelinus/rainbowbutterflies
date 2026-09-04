import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const threadId = Number(getRouterParam(event, 'threadId'))
  if (!Number.isInteger(threadId) || threadId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid threadId.' })
  }

  return await kindRobotsAs({
    path: `/api/v1/agent/messages/${threadId}/read`,
    token: delegationToken,
    method: 'PATCH',
  })
})
