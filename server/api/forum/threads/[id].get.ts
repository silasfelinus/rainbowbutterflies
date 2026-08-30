import {
  createError,
  defineEventHandler,
  getRouterParam,
  setHeader,
} from 'h3'
import {
  buildForumThreadPath,
  type ForumThreadResponse,
} from '../../../../utils/forumContract'
import { kindRobotsGet } from '../../../utils/kindRobots'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const path = buildForumThreadPath(getRouterParam(event, 'id'))
  if (!path) {
    throw createError({ statusCode: 400, message: 'Invalid forum thread ID.' })
  }
  return await kindRobotsGet<ForumThreadResponse>(path)
})
