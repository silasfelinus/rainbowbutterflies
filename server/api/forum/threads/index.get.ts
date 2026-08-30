import { defineEventHandler, getQuery, setHeader } from 'h3'
import {
  buildForumThreadsPath,
  type ForumThreadsResponse,
} from '../../../../utils/forumContract'
import { kindRobotsGet } from '../../../utils/kindRobots'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const query = getQuery(event) as Record<string, unknown>
  return await kindRobotsGet<ForumThreadsResponse>(buildForumThreadsPath(query))
})
