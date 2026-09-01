import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'
import { kindRobotsPost } from '../../utils/kindRobots'
import {
  setRainbowDelegationCookie,
  setRainbowSessionCookie,
} from '../../utils/authSession'
import { RAINBOW_AUTH_CLIENT_ID } from '../../../utils/authSessionContract'

type LoginBody = {
  username?: unknown
  password?: unknown
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

  const body = await readBody<LoginBody>(event)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    setResponseStatus(event, 400)
    return { success: false, message: 'Username and password are required.' }
  }

  try {
    const result = await kindRobotsPost<KindLoginResponse>(
      '/api/auth/first-party/password',
      {
        client_id: RAINBOW_AUTH_CLIENT_ID,
        username,
        password,
      },
    )

    const id = Number(result.user?.id)
    const resolvedUsername = String(result.user?.username || '').trim()
    const delegationToken = String(result.delegationToken || '').trim()
    if (
      !result.success ||
      !Number.isInteger(id) ||
      id <= 0 ||
      !resolvedUsername ||
      !delegationToken
    ) {
      setResponseStatus(event, 401)
      return { success: false, message: result.message || 'Invalid username or password.' }
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
    setResponseStatus(event, 401)
    return { success: false, message: 'Invalid username or password.' }
  }
})
