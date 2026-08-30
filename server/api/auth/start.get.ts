import {
  defineEventHandler,
  getQuery,
  sendRedirect,
  setHeader,
} from 'h3'
import {
  RAINBOW_AUTH_CLIENT_ID,
  normalizeLocalReturnPath,
  pkceS256,
  randomBase64Url,
} from '~/utils/authSessionContract'
import {
  createPendingAuthFlow,
  setPendingAuthCookie,
} from '@/server/utils/authSession'
import { getKindRobotsBaseUrl } from '@/server/utils/kindRobots'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const query = getQuery(event)
  const state = randomBase64Url(32)
  const verifier = randomBase64Url(32)
  const flow = createPendingAuthFlow({
    state,
    verifier,
    returnTo: normalizeLocalReturnPath(query.returnTo),
  })

  setPendingAuthCookie(event, flow)

  const authorizeUrl = new URL(
    '/api/auth/first-party/authorize',
    `${getKindRobotsBaseUrl()}/`,
  )
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', RAINBOW_AUTH_CLIENT_ID)
  authorizeUrl.searchParams.set('redirect_uri', flow.redirectUri)
  authorizeUrl.searchParams.set('code_challenge', pkceS256(flow.verifier))
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')
  authorizeUrl.searchParams.set('state', flow.state)

  return await sendRedirect(event, authorizeUrl.toString(), 302)
})
