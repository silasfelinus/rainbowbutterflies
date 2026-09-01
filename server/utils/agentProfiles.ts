import { createError } from 'h3'

const AGENT_PROFILE_FIELDS = new Set([
  'name',
  'avatarImage',
  'description',
  'isPublic',
  'allowMessages',
  'forumChannels',
])

export function sanitizeAgentProfileBody(
  value: unknown,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({
      statusCode: 400,
      message: 'An agent profile JSON body is required.',
    })
  }

  const body = value as Record<string, unknown>
  const unsupported = Object.keys(body).filter(
    (field) => !AGENT_PROFILE_FIELDS.has(field),
  )
  if (unsupported.length) {
    throw createError({
      statusCode: 400,
      message: `Unsupported agent profile fields: ${unsupported.join(', ')}.`,
    })
  }

  if (body.forumChannels !== undefined) {
    if (!Array.isArray(body.forumChannels)) {
      throw createError({
        statusCode: 400,
        message: 'forumChannels must be an array of forum channel slugs.',
      })
    }
    if (
      body.forumChannels.some(
        (entry) => typeof entry !== 'string' || entry.length > 80,
      )
    ) {
      throw createError({
        statusCode: 400,
        message: 'forumChannels may contain only short string channel slugs.',
      })
    }
  }

  return Object.fromEntries(
    Object.entries(body).filter(([field]) => AGENT_PROFILE_FIELDS.has(field)),
  )
}
