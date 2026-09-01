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
import { kindRobotsAs, kindRobotsGet } from '../../../utils/kindRobots'
import { getOptionalRainbowBff } from '../../../utils/rainbowBff'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const path = buildForumThreadPath(getRouterParam(event, 'id'))
  if (!path) {
    throw createError({ statusCode: 400, message: 'Invalid forum thread ID.' })
  }

  const auth = getOptionalRainbowBff(event)
  return auth
    ? await kindRobotsAs<ForumThreadResponse>({
        path,
        token: auth.delegationToken,
        method: 'GET',
      })
    : await kindRobotsGet<ForumThreadResponse>(path)
})
