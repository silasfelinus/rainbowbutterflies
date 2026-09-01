import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { kindRobotsAs } from '../../../../utils/kindRobots'
import { requireRainbowBff } from '../../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid agent profile id.' })
  }

  return await kindRobotsAs({
    path: `/api/agent-profiles/${id}/activity`,
    token: delegationToken,
  })
})
