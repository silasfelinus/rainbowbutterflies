import { defineEventHandler, setHeader } from 'h3'
import type { ForumChannelsResponse } from '../../../utils/forumContract'
import { kindRobotsGet } from '../../utils/kindRobots'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=300')
  return await kindRobotsGet<ForumChannelsResponse>('/api/v1/forum/channels')
})
