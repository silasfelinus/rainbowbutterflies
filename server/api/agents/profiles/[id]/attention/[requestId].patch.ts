import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
  setHeader,
} from 'h3'
import { kindRobotsAs } from '../../../../../utils/kindRobots'
import { requireRainbowBff } from '../../../../../utils/rainbowBff'

const allowedStatuses = new Set(['APPROVED', 'DECLINED', 'RESOLVED'])

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const id = Number(getRouterParam(event, 'id'))
  const requestId = Number(getRouterParam(event, 'requestId'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid agent profile id.' })
  }
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid attention request id.' })
  }

  const raw = await readBody<{ status?: unknown; resolution?: unknown }>(event)
  const status = typeof raw?.status === 'string' ? raw.status : ''
  if (!allowedStatuses.has(status)) {
    throw createError({
      statusCode: 400,
      message: 'status must be APPROVED, DECLINED, or RESOLVED.',
    })
  }
  const resolution =
    raw?.resolution === undefined || raw.resolution === null
      ? null
      : typeof raw.resolution === 'string'
        ? raw.resolution.trim() || null
        : null
  if (typeof raw?.resolution !== 'undefined' && raw.resolution !== null && typeof raw.resolution !== 'string') {
    throw createError({ statusCode: 400, message: 'resolution must be text.' })
  }
  if (resolution && resolution.length > 5000) {
    throw createError({
      statusCode: 400,
      message: 'resolution must be 5000 characters or fewer.',
    })
  }

  return await kindRobotsAs({
    path: `/api/agent-profiles/${id}/attention/${requestId}`,
    token: delegationToken,
    method: 'PATCH',
    body: { status, resolution },
  })
})
