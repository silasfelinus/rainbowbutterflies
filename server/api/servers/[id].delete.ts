import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

function requireServerId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value) || Number(value) <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid generator server ID.' })
  }
  return value
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const id = requireServerId(getRouterParam(event, 'id'))

  return await kindRobotsAs({
    path: `/api/server/${id}`,
    token: delegationToken,
    method: 'DELETE',
  })
})
