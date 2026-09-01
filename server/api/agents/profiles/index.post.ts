import { defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const body = await readBody<Record<string, unknown>>(event)
  return await kindRobotsAs({
    path: '/api/agent-profiles',
    token: delegationToken,
    method: 'POST',
    body,
  })
})
