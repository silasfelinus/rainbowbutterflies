import { defineEventHandler, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'
import { safeRainbowServer } from '../../utils/generatorServers'

type ServerListResponse = {
  success: boolean
  message?: string
  data?: Record<string, unknown>[]
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { user, delegationToken } = requireRainbowBff(event)
  const result = await kindRobotsAs<ServerListResponse>({
    path: '/api/server',
    token: delegationToken,
  })

  const servers = (result.data ?? []).map((server) => safeRainbowServer(server, user.id))
  return {
    success: result.success,
    message: result.message,
    servers,
  }
})
