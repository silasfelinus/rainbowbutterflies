import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { kindRobotsGet } from '../../../utils/kindRobots'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, message: 'Invalid agent profile id.' })
  }
  setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return await kindRobotsGet(`/api/rainbow/directory/agents/${id}`)
})
