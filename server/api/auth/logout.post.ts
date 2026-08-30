import {
  defineEventHandler,
  setHeader,
} from 'h3'
import {
  clearPendingAuthCookie,
  clearRainbowSessionCookie,
} from '../../utils/authSession'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  clearPendingAuthCookie(event)
  clearRainbowSessionCookie(event)

  return { success: true }
})
