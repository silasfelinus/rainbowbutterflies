import { createError, defineEventHandler, getRouterParam, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'
import {
  buildRainbowServerUpdate,
  safeRainbowServer,
} from '../../utils/generatorServers'

type ServerWriteResponse = {
  success: boolean
  message?: string
  data?: Record<string, unknown> | null
}

function requireServerId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value) || Number(value) <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid generator server ID.' })
  }
  return value
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { user, delegationToken } = requireRainbowBff(event)
  const id = requireServerId(getRouterParam(event, 'id'))
  const body = buildRainbowServerUpdate(await readBody(event))
  const result = await kindRobotsAs<ServerWriteResponse>({
    path: `/api/server/${id}`,
    token: delegationToken,
    method: 'PATCH',
    body,
  })

  return {
    success: result.success,
    message: result.message,
    server: result.data ? safeRainbowServer(result.data, user.id) : null,
  }
})
