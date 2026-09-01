import { defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const body = await readBody<Record<string, unknown>>(event)

  // Rainbow AgentProfiles are designed around asynchronous check-ins. Keep
  // that heartbeat capability on every profile-bound key without making users
  // understand an implementation scope during ordinary onboarding.
  const agentProfileId = Number(body.agentProfileId)
  const requestedScopes = Array.isArray(body.scopes)
    ? body.scopes.filter((scope): scope is string => typeof scope === 'string')
    : []
  const scopes =
    Number.isInteger(agentProfileId) && agentProfileId > 0
      ? Array.from(new Set([...requestedScopes, 'agent:checkin']))
      : requestedScopes

  return await kindRobotsAs({
    path: '/api/agent-credentials',
    token: delegationToken,
    method: 'POST',
    body: {
      ...body,
      scopes,
    },
  })
})
