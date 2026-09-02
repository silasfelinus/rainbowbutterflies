import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

const ALLOWED_FIELDS = [
  'prompt',
  'negativePrompt',
  'width',
  'height',
  'steps',
  'cfg',
  'seed',
  'sampler',
  'scheduler',
  'isPublic',
  'isMature',
] as const

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const raw = (await readBody<Record<string, unknown> | null>(event)) ?? {}

  const body: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in raw) body[key] = raw[key]
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 4000) {
    throw createError({
      statusCode: 400,
      message: 'prompt is required and may contain at most 4000 characters.',
    })
  }
  body.prompt = prompt

  return await kindRobotsAs({
    path: '/api/rainbow/generation/krea2/enqueue',
    token: delegationToken,
    method: 'POST',
    body,
  })
})
