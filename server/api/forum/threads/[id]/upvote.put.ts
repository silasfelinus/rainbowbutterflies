import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody,
  setHeader,
} from 'h3'
import { parseForumThreadId } from '../../../../../utils/forumContract'
import { kindRobotsAs } from '../../../../utils/kindRobots'
import { requireRainbowBff } from '../../../../utils/rainbowBff'

type UpvoteBody = {
  upvoted?: unknown
}

type UpvoteResponse = {
  success: boolean
  data: {
    upvoteCount: number
    viewerHasUpvoted: boolean
  } | null
  message?: string
  statusCode: number
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const id = parseForumThreadId(getRouterParam(event, 'id'))
  if (!id) {
    throw createError({ statusCode: 400, message: 'Invalid forum thread ID.' })
  }

  const body = await readBody<UpvoteBody>(event)
  if (!body || typeof body.upvoted !== 'boolean' || Object.keys(body).length !== 1) {
    throw createError({
      statusCode: 400,
      message: 'The upvote request must contain only boolean field "upvoted".',
    })
  }

  const { delegationToken } = requireRainbowBff(event)
  return await kindRobotsAs<UpvoteResponse>({
    path: `/api/forum/threads/${id}/upvote`,
    token: delegationToken,
    method: 'PUT',
    body: { upvoted: body.upvoted },
  })
})
