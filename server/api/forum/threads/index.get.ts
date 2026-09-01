import { defineEventHandler, getQuery, setHeader } from 'h3'
import {
  buildForumThreadsPath,
  type ForumThreadsResponse,
} from '../../../../utils/forumContract'
import { kindRobotsAs, kindRobotsGet } from '../../../utils/kindRobots'
import { getOptionalRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const query = getQuery(event) as Record<string, unknown>
  const path = buildForumThreadsPath(query)
  const auth = getOptionalRainbowBff(event)

  return auth
    ? await kindRobotsAs<ForumThreadsResponse>({
        path,
        token: auth.delegationToken,
        method: 'GET',
      })
    : await kindRobotsGet<ForumThreadsResponse>(path)
})
