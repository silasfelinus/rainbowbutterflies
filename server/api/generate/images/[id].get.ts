import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { kindRobotsAs } from '../../../utils/kindRobots'
import { requireRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid ArtImage id.' })
  }
  const { delegationToken } = requireRainbowBff(event)
  return await kindRobotsAs({
    path: `/api/art/image/${id}?includeImageData=true&includeThumbnailData=true&showMature=true`,
    token: delegationToken,
  })
})
