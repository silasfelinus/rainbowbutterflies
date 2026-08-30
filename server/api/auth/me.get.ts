import {
  defineEventHandler,
  setHeader,
} from 'h3'
import {
  clearRainbowSessionCookie,
  readRainbowSessionCookie,
} from '../../utils/authSession'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  const session = readRainbowSessionCookie(event)
  if (!session) {
    clearRainbowSessionCookie(event)
    return {
      authenticated: false as const,
      user: null,
      expiresAt: null,
    }
  }

  return {
    authenticated: true as const,
    user: session.user,
    expiresAt: new Date(session.expiresAt).toISOString(),
  }
})
