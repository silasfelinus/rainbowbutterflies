import { defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'
import {
  buildRainbowServerCreate,
  safeRainbowServer,
} from '../../utils/generatorServers'

type ServerWriteResponse = {
  success: boolean
  message?: string
  data?: Record<string, unknown> | null
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { user, delegationToken } = requireRainbowBff(event)
  const body = buildRainbowServerCreate(await readBody(event))
  const result = await kindRobotsAs<ServerWriteResponse>({
    path: '/api/server',
    token: delegationToken,
    method: 'POST',
    body,
  })

  return {
    success: result.success,
    message: result.message,
    server: result.data ? safeRainbowServer(result.data, user.id) : null,
  }
})
