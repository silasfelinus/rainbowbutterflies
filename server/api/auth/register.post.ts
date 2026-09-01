import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'
import { kindRobotsPost } from '../../utils/kindRobots'
import { setRainbowSessionCookie } from '../../utils/authSession'

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
  data?: {
    id?: number
    username?: string
  }
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

    const login = await kindRobotsPost<KindLoginResponse>('/api/auth/login', {
      username,
      password,
    })
    const id = Number(login.data?.id)
    const resolvedUsername = String(login.data?.username || '').trim()

    if (!login.success || !Number.isInteger(id) || id <= 0 || !resolvedUsername) {
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
