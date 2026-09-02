import { defineEventHandler, setHeader } from 'h3'
import { kindRobotsGet } from '../../utils/kindRobots'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  return await kindRobotsGet('/api/rainbow/directory')
})
