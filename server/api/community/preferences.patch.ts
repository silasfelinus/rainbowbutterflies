import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

type PreferenceBody = { isPublic?: unknown; allowMessages?: unknown }

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const body = (await readBody<PreferenceBody>(event)) ?? {}
  if (typeof body.isPublic !== 'boolean' || typeof body.allowMessages !== 'boolean') {
    throw createError({ statusCode: 400, message: 'Directory preferences must be booleans.' })
  }
  return await kindRobotsAs({
    path: '/api/rainbow/directory/preferences',
    token: delegationToken,
    method: 'PATCH',
    body: { isPublic: body.isPublic, allowMessages: body.allowMessages },
  })
})
