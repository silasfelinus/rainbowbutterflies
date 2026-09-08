import {
  createError,
  defineEventHandler,
  getHeader,
  readMultipartFormData,
  setHeader,
} from 'h3'
import {
  getKindRobotsBaseUrl,
  kindRobotsAs,
  resolveKindRobotsUrl,
} from '../../utils/kindRobots'
import { requireRainbowBff } from '../../utils/rainbowBff'

const MAX_IMAGE_BYTES = 15 * 1024 * 1024
const MAX_REQUEST_BYTES = MAX_IMAGE_BYTES + 1024 * 1024
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

type UploadResponse = {
  success: boolean
  message?: string
  data?: {
    id?: number
  } | null
}

type ProfileResponse = {
  success: boolean
  user?: {
    avatarImage?: string | null
    artImageId?: number | null
  }
  message?: string
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const { user, delegationToken } = requireRainbowBff(event)

  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw createError({ statusCode: 413, message: 'Avatar is too large. Maximum image size is 15 MB.' })
  }

  const form = await readMultipartFormData(event)
  const image = form?.find((field) => field.name === 'image' || field.name === 'file')
  if (!image?.data?.length) {
    throw createError({ statusCode: 400, message: 'Choose an image to upload.' })
  }
  if (image.data.length > MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 413, message: 'Avatar is too large. Maximum image size is 15 MB.' })
  }

  const mimeType = String(image.type || '').toLowerCase()
  if (!IMAGE_TYPES.has(mimeType)) {
    throw createError({ statusCode: 415, message: 'Use a PNG, JPEG, or WebP image.' })
  }

  const fileName = image.filename?.trim() || 'rainbow-avatar'
  const upstream = new FormData()
  upstream.append(
    'image',
    new Blob([new Uint8Array(image.data)], { type: mimeType }),
    fileName,
  )
  upstream.append('galleryName', 'avatarUploads')
  upstream.append('fileName', fileName)
  upstream.append('designer', user.username)
  upstream.append('promptString', '[UserAvatar]')
  upstream.append('artPrompt', '[UserAvatar]')
  upstream.append('path', '[UserAvatar]')
  upstream.append('isPublic', 'false')
  upstream.append('isMature', 'false')

  let upload: UploadResponse
  try {
    upload = await $fetch<UploadResponse>(resolveKindRobotsUrl('/api/art/upload'), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${delegationToken}`,
      },
      body: upstream,
    })
  } catch (error) {
    const candidate = error as { data?: { message?: string }; message?: string }
    throw createError({
      statusCode: 502,
      message: candidate.data?.message || candidate.message || 'Kind Robots could not store the avatar.',
    })
  }

  const artImageId = Number(upload.data?.id)
  if (!upload.success || !Number.isInteger(artImageId) || artImageId <= 0) {
    throw createError({
      statusCode: 502,
      message: upload.message || 'Kind Robots did not return an uploaded image.',
    })
  }

  const profile = await kindRobotsAs<ProfileResponse>({
    path: '/api/rainbow/directory/profile',
    token: delegationToken,
    method: 'PATCH',
    body: { artImageId },
  })

  if (!profile.success) {
    throw createError({
      statusCode: 502,
      message: profile.message || 'The image uploaded, but could not be attached to your profile.',
    })
  }

  return {
    success: true,
    artImageId,
    avatarImage:
      profile.user?.avatarImage ||
      `${getKindRobotsBaseUrl()}/api/art/images/${artImageId}/file`,
  }
})
