import { defineEventHandler, setHeader } from 'h3'
import {
  clearPendingAuthCookie,
  clearRainbowDelegationCookie,
  clearRainbowSessionCookie,
} from '../../utils/authSession'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Pragma', 'no-cache')

  clearPendingAuthCookie(event)
  clearRainbowSessionCookie(event)
  clearRainbowDelegationCookie(event)

  return { success: true }
})
