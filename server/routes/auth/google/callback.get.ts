import { defineEventHandler, getQuery, sendRedirect, setHeader } from 'h3'
import {
  RAINBOW_AUTH_CLIENT_ID,
  evaluateAuthorizationCallback,
} from '../../../../utils/authSessionContract'
import {
  clearPendingAuthCookie,
  readPendingAuthCookie,
  setRainbowSessionCookie,
} from '../../../utils/authSession'
import { kindRobotsPost } from '../../../utils/kindRobots'

type GoogleExchangeResponse = {
  success: boolean
  user?: {
    id: number
    username: string
  }
}

function loginFailureUrl(reason: string): string {
  const query = new URLSearchParams({ error: reason })
  return `/login?${query.toString()}`
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const query = getQuery(event)
  const flow = readPendingAuthCookie(event)

  if (query.error) {
    clearPendingAuthCookie(event)
    return await sendRedirect(event, loginFailureUrl('google-cancelled'), 302)
  }

  const decision = evaluateAuthorizationCallback(flow, {
    code: query.code,
    state: query.state,
  })

  if (!decision.ok || !flow || flow.redirectUri !== decision.redirectUri) {
    clearPendingAuthCookie(event)
    return await sendRedirect(event, loginFailureUrl(`google-${decision.reason}`), 302)
  }

  try {
    const result = await kindRobotsPost<GoogleExchangeResponse>(
      '/api/auth/first-party/google/exchange',
      {
        client_id: RAINBOW_AUTH_CLIENT_ID,
        redirect_uri: decision.redirectUri,
        code: decision.code,
        code_verifier: decision.verifier,
      },
    )

    if (!result.success || !result.user) {
      throw new Error('Kind Robots did not return a Google identity.')
    }

    setRainbowSessionCookie(event, result.user)
    clearPendingAuthCookie(event)
    return await sendRedirect(event, decision.returnTo, 302)
  } catch {
    clearPendingAuthCookie(event)
    return await sendRedirect(event, loginFailureUrl('google-exchange'), 302)
  }
})
