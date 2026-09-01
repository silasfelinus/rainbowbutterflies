import { createError, defineEventHandler, getRouterParam, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid agent profile id.' })
  }
  const body = await readBody<Record<string, unknown>>(event)
  return await kindRobotsAs({
    path: `/api/agent-profiles/${id}`,
    token: delegationToken,
    method: 'PATCH',
    body,
  })
})
