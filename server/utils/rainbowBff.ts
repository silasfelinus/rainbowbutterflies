import { createError, type H3Event } from 'h3'
import {
  readRainbowDelegationCookie,
  readRainbowSessionCookie,
} from './authSession'

export function requireRainbowBff(event: H3Event) {
  const session = readRainbowSessionCookie(event)
  if (!session) {
    throw createError({ statusCode: 401, message: 'Sign in to continue.' })
  }

  const delegationToken = readRainbowDelegationCookie(event)
  if (!delegationToken) {
    throw createError({
      statusCode: 401,
      message: 'Your Rainbow session needs to be refreshed. Please sign out and sign in again.',
    })
  }

  return {
    user: session.user,
    delegationToken,
  }
}
