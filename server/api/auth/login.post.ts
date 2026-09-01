import { defineEventHandler, readBody, setHeader, setResponseStatus } from 'h3'
import { kindRobotsPost } from '../../utils/kindRobots'
import { setRainbowSessionCookie } from '../../utils/authSession'

type LoginBody = {
  username?: unknown
  password?: unknown
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

  const body = await readBody<LoginBody>(event)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    setResponseStatus(event, 400)
    return { success: false, message: 'Username and password are required.' }
  }

  try {
    const result = await kindRobotsPost<KindLoginResponse>('/api/auth/login', {
      username,
      password,
    })

    const id = Number(result.data?.id)
    const resolvedUsername = String(result.data?.username || '').trim()
    if (!result.success || !Number.isInteger(id) || id <= 0 || !resolvedUsername) {
      setResponseStatus(event, 401)
      return { success: false, message: result.message || 'Invalid username or password.' }
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
    setResponseStatus(event, 401)
    return { success: false, message: 'Invalid username or password.' }
  }
})
