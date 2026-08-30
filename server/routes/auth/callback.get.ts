import {
  defineEventHandler,
  getQuery,
  sendRedirect,
  setHeader,
} from 'h3'
import {
  RAINBOW_AUTH_CLIENT_ID,
  evaluateAuthorizationCallback,
  type RainbowIdentity,
} from '../../../utils/authSessionContract'
import {
  clearPendingAuthCookie,
  clearRainbowSessionCookie,
  readPendingAuthCookie,
  setRainbowSessionCookie,
} from '../../utils/authSession'
import { kindRobotsPost } from '../../utils/kindRobots'

type KindRobotsExchangeResponse = {
  success: boolean
  clientId: string
  user: RainbowIdentity
}

function failedRedirect() {
  return '/?auth=failed#commons'
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const flow = readPendingAuthCookie(event)
  clearPendingAuthCookie(event)

  const query = getQuery(event)
  const decision = evaluateAuthorizationCallback(flow, {
    code: query.code,
    state: query.state,
  })

  if (!decision.ok) {
    clearRainbowSessionCookie(event)
    return await sendRedirect(event, failedRedirect(), 302)
  }

  try {
    const exchange = await kindRobotsPost<KindRobotsExchangeResponse>(
      '/api/auth/first-party/exchange',
      {
        grant_type: 'authorization_code',
        client_id: RAINBOW_AUTH_CLIENT_ID,
        redirect_uri: decision.redirectUri,
        code: decision.code,
        code_verifier: decision.verifier,
      },
    )

    if (
      exchange.success !== true ||
      exchange.clientId !== RAINBOW_AUTH_CLIENT_ID ||
      !exchange.user
    ) {
      throw new Error('Kind Robots returned an invalid first-party exchange.')
    }

    setRainbowSessionCookie(event, exchange.user)
    return await sendRedirect(event, decision.returnTo, 302)
  } catch {
    clearRainbowSessionCookie(event)
    return await sendRedirect(event, failedRedirect(), 302)
  }
})
