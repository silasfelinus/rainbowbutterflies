export type ForumOrder = 'recent' | 'chronological'

export type ForumChannel = {
  slug: string
  label: string
  description: string
}

export type ForumIdentity = {
  id: number
  username: string
  avatarImage: string | null
}

export type ForumBotIdentity = {
  id: number
  name: string
  slug: string
  avatarImage: string | null
}

export type ForumAuthor = {
  kind: 'HUMAN' | 'AI_AGENT'
  displayName: string
  user: ForumIdentity | null
  bot: ForumBotIdentity | null
}

export type ForumAttachmentKind = 'ART_IMAGE' | 'PROJECT'

export type ForumAttachment = {
  kind: ForumAttachmentKind
  id: number
  title: string
  summary: string | null
  imageUrl: string | null
  canonicalUrl: string
}

export type ForumPost = {
  id: number
  createdAt: string
  updatedAt: string | null
  threadId: number
  parentId: number | null
  channel: string
  title: string | null
  content: string
  isMature: boolean
  attachments: ForumAttachment[]
  author: ForumAuthor
}

export type ForumThreadSummary = ForumPost & {
  replyCount: number
  lastActivityAt: string
}

export type ForumThreadsResponse = {
  success: boolean
  data: ForumThreadSummary[]
  page: {
    order: ForumOrder
    limit: number
    nextCursor: number | null
  } | null
  message?: string
  statusCode: number
}

export type ForumThreadResponse = {
  success: boolean
  data: {
    thread: ForumPost
    replies: ForumPost[]
  } | null
  message?: string
  statusCode: number
}

export type ForumChannelsResponse = {
  success: boolean
  data: ForumChannel[]
  message?: string
  statusCode: number
}

export type ForumReplyRow = {
  post: ForumPost
  depth: number
}

export type ForumReplyPresentation = {
  mode: 'nested' | 'chronological'
  rows: ForumReplyRow[]
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function firstString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

export function normalizeForumChannel(value: unknown): string | null {
  const slug = firstString(value).toLowerCase()
  if (!slug || slug.length > 80 || !SLUG_PATTERN.test(slug)) return null
  return slug
}

export function normalizeForumOrder(value: unknown): ForumOrder {
  return firstString(value) === 'chronological' ? 'chronological' : 'recent'
}

export function normalizeForumCursor(value: unknown): number | null {
  const raw = firstString(value)
  if (!raw || !/^\d+$/.test(raw)) return null
  const cursor = Number(raw)
  return Number.isSafeInteger(cursor) && cursor > 0 ? cursor : null
}

export function normalizeForumLimit(value: unknown): number {
  const raw = firstString(value)
  const parsed = /^\d+$/.test(raw) ? Number(raw) : 20
  if (!Number.isFinite(parsed)) return 20
  return Math.max(1, Math.min(50, Math.trunc(parsed)))
}

export function buildForumThreadsPath(query: Record<string, unknown>): string {
  const params = new URLSearchParams()
  const channel = normalizeForumChannel(query.channel)
  const cursor = normalizeForumCursor(query.cursor)
  const order = normalizeForumOrder(query.order)
  const limit = normalizeForumLimit(query.limit)

  if (channel) params.set('channel', channel)
  if (cursor) params.set('cursor', String(cursor))
  params.set('order', order)
  params.set('limit', String(limit))

  return `/api/v1/forum/threads?${params.toString()}`
}

export function parseForumThreadId(value: unknown): number | null {
  const raw = firstString(value)
  if (!/^\d+$/.test(raw)) return null
  const id = Number(raw)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function buildForumThreadPath(value: unknown): string | null {
  const id = parseForumThreadId(value)
  return id ? `/api/v1/forum/threads/${id}` : null
}

function sortReplies(replies: ForumPost[]): ForumPost[] {
  return [...replies].sort((a, b) => {
    const time = Date.parse(a.createdAt) - Date.parse(b.createdAt)
    return time || a.id - b.id
  })
}

export function buildReplyPresentation(
  threadId: number,
  replies: ForumPost[],
): ForumReplyPresentation {
  const ordered = sortReplies(replies)
  const byId = new Map(ordered.map((reply) => [reply.id, reply]))

  let invalid = false
  for (const reply of ordered) {
    if (reply.threadId !== threadId || reply.id === threadId) {
      invalid = true
      break
    }

    const visited = new Set<number>([reply.id])
    let parentId = reply.parentId
    while (parentId && parentId !== threadId) {
      const parent = byId.get(parentId)
      if (!parent || visited.has(parentId)) {
        invalid = true
        break
      }
      visited.add(parentId)
      parentId = parent.parentId
    }
    if (invalid) break
  }

  if (invalid) {
    return {
      mode: 'chronological',
      rows: ordered.map((post) => ({ post, depth: 0 })),
    }
  }

  const children = new Map<number, ForumPost[]>()
  for (const reply of ordered) {
    const parent = reply.parentId && reply.parentId !== threadId
      ? reply.parentId
      : threadId
    const rows = children.get(parent) ?? []
    rows.push(reply)
    children.set(parent, rows)
  }

  const rows: ForumReplyRow[] = []
  const visit = (parentId: number, depth: number) => {
    for (const child of children.get(parentId) ?? []) {
      rows.push({ post: child, depth })
      visit(child.id, depth + 1)
    }
  }
  visit(threadId, 0)

  if (rows.length !== ordered.length) {
    return {
      mode: 'chronological',
      rows: ordered.map((post) => ({ post, depth: 0 })),
    }
  }

  return { mode: 'nested', rows }
}
