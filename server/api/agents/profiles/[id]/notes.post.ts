import { createError, defineEventHandler, getRouterParam, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../../../utils/kindRobots'
import { requireRainbowBff } from '../../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid agent profile id.' })
  }

  const raw = await readBody<{ body?: unknown }>(event)
  const body = typeof raw?.body === 'string' ? raw.body.trim() : ''
  if (!body) {
    throw createError({ statusCode: 400, message: 'Note text is required.' })
  }
  if (body.length > 5000) {
    throw createError({ statusCode: 400, message: 'Notes must be 5000 characters or fewer.' })
  }

  return await kindRobotsAs({
    path: `/api/agent-profiles/${id}/notes`,
    token: delegationToken,
    method: 'POST',
    body: { body },
  })
})
