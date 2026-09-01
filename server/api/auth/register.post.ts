import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'
import { kindRobotsPost } from '../../utils/kindRobots'
import {
  setRainbowDelegationCookie,
  setRainbowSessionCookie,
} from '../../utils/authSession'
import { RAINBOW_AUTH_CLIENT_ID } from '../../../utils/authSessionContract'

type RegisterBody = {
  username?: unknown
  email?: unknown
  password?: unknown
  referralCode?: unknown
}

type KindRegisterResponse = {
  success: boolean
  message?: string
  statusCode?: number
}

type KindLoginResponse = {
  success: boolean
  message?: string
  user?: {
    id?: number
    username?: string
  }
  delegationToken?: string
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const body = await readBody<RegisterBody>(event)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const referralCode =
    typeof body?.referralCode === 'string' && body.referralCode.trim()
      ? body.referralCode.trim()
      : undefined

  if (!username || !email || password.length < 8) {
    setResponseStatus(event, 400)
    return {
      success: false,
      message: 'Username, email, and a password of at least 8 characters are required.',
    }
  }

  try {
    const registration = await kindRobotsPost<KindRegisterResponse>('/api/users/register', {
      username,
      email,
      password,
      ...(referralCode ? { referralCode } : {}),
    })

    if (!registration.success) {
      setResponseStatus(event, registration.statusCode || 400)
      return {
        success: false,
        message: registration.message || 'Account creation failed.',
      }
    }

    const login = await kindRobotsPost<KindLoginResponse>(
      '/api/auth/first-party/password',
      {
        client_id: RAINBOW_AUTH_CLIENT_ID,
        username,
        password,
      },
    )
    const id = Number(login.user?.id)
    const resolvedUsername = String(login.user?.username || '').trim()
    const delegationToken = String(login.delegationToken || '').trim()

    if (
      !login.success ||
      !Number.isInteger(id) ||
      id <= 0 ||
      !resolvedUsername ||
      !delegationToken
    ) {
      setResponseStatus(event, 502)
      return {
        success: false,
        message: 'Your account was created, but automatic sign-in failed. Please sign in.',
      }
    }

    const session = setRainbowSessionCookie(event, {
      id,
      username: resolvedUsername,
    })
    setRainbowDelegationCookie(event, delegationToken)

    return {
      success: true,
      user: session.user,
      expiresAt: session.expiresAt,
    }
  } catch {
    setResponseStatus(event, 502)
    return {
      success: false,
      message: 'Account creation is temporarily unavailable. Please try again.',
    }
  }
})
