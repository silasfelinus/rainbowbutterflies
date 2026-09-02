import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { kindRobotsAs } from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

type ProfileBody = {
  avatarImage?: unknown
  bio?: unknown
  designerName?: unknown
}

function safeText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, message: `${label} must be text.` })
  }
  const trimmed = value.trim()
  if (trimmed.length > max) {
    throw createError({ statusCode: 400, message: `${label} must be ${max} characters or fewer.` })
  }
  return trimmed || null
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { delegationToken } = requireRainbowBff(event)
  const body = (await readBody<ProfileBody>(event)) ?? {}
  return await kindRobotsAs({
    path: '/api/rainbow/directory/profile',
    token: delegationToken,
    method: 'PATCH',
    body: {
      avatarImage: safeText(body.avatarImage, 'avatarImage', 764),
      bio: safeText(body.bio, 'bio', 5000),
      designerName: safeText(body.designerName, 'designerName', 120),
    },
  })
})
