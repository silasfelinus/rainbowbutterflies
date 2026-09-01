import { defineEventHandler, getQuery, sendRedirect, setHeader } from 'h3'
import {
  RAINBOW_AUTH_CLIENT_ID,
  normalizeLocalReturnPath,
  pkceS256,
  randomBase64Url,
} from '../../../../utils/authSessionContract'
import {
  createPendingGoogleAuthFlow,
  setPendingAuthCookie,
} from '../../../utils/authSession'
import { kindRobotsGet } from '../../../utils/kindRobots'

type GoogleConfigResponse = {
  success: boolean
  clientId: string
  redirectUri: string
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const query = getQuery(event)
  const state = randomBase64Url(32)
  const verifier = randomBase64Url(32)
  const flow = createPendingGoogleAuthFlow({
    state,
    verifier,
    returnTo: normalizeLocalReturnPath(query.returnTo, '/'),
  })

  const configQuery = new URLSearchParams({
    client_id: RAINBOW_AUTH_CLIENT_ID,
    redirect_uri: flow.redirectUri,
  })
  const google = await kindRobotsGet<GoogleConfigResponse>(
    `/api/auth/first-party/google/config?${configQuery.toString()}`,
  )

  if (!google.success || !google.clientId || google.redirectUri !== flow.redirectUri) {
    throw new Error('Google sign-in configuration is unavailable.')
  }

  setPendingAuthCookie(event, flow)

  const destination = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  destination.searchParams.set('response_type', 'code')
  destination.searchParams.set('client_id', google.clientId)
  destination.searchParams.set('redirect_uri', flow.redirectUri)
  destination.searchParams.set('scope', 'openid email profile')
  destination.searchParams.set('state', flow.state)
  destination.searchParams.set('code_challenge', pkceS256(flow.verifier))
  destination.searchParams.set('code_challenge_method', 'S256')
  destination.searchParams.set('prompt', 'select_account')

  return await sendRedirect(event, destination.toString(), 302)
})
