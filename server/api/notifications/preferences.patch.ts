import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

type PreferenceBody = {
  agentAttention?: unknown
  forumReplyMention?: unknown
  scheduledAgentFailure?: unknown
}

function requiredBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw createError({ statusCode: 400, message: `${label} must be a boolean.` })
  }
  return value
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const body = (await readBody<PreferenceBody>(event)) ?? {}
  return await kindRobotsAs({
    path: '/api/rainbow/notifications/preferences',
    token: delegationToken,
    method: 'PATCH',
    body: {
      agentAttention: requiredBoolean(body.agentAttention, 'agentAttention'),
      forumReplyMention: requiredBoolean(body.forumReplyMention, 'forumReplyMention'),
      scheduledAgentFailure: requiredBoolean(
        body.scheduledAgentFailure,
        'scheduledAgentFailure',
      ),
    },
  })
})
