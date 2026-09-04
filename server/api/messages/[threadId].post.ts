import { createError, defineEventHandler, getRouterParam, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

type MessageBody = { body?: unknown; clientKey?: unknown }

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const threadId = Number(getRouterParam(event, 'threadId'))
  if (!Number.isInteger(threadId) || threadId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid threadId.' })
  }
  const input = (await readBody<MessageBody>(event)) ?? {}
  if (typeof input.body !== 'string' || !input.body.trim() || input.body.trim().length > 5000) {
    throw createError({ statusCode: 400, message: 'Message must be 1 to 5000 characters.' })
  }
  if (typeof input.clientKey !== 'string' || !input.clientKey.trim() || input.clientKey.trim().length > 120) {
    throw createError({ statusCode: 400, message: 'A valid message client key is required.' })
  }

  return await kindRobotsAs({
    path: `/api/v1/agent/messages/${threadId}`,
    token: delegationToken,
    method: 'POST',
    body: { body: input.body.trim(), clientKey: input.clientKey.trim() },
  })
})
