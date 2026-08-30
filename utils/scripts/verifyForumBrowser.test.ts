import assert from 'node:assert/strict'
import {
  buildForumThreadPath,
  buildForumThreadsPath,
  buildReplyPresentation,
  type ForumPost,
} from '../forumContract'

const human = {
  kind: 'HUMAN' as const,
  displayName: 'Reader',
  user: { id: 7, username: 'reader', avatarImage: null },
  bot: null,
}

function post(id: number, parentId: number | null, threadId = 10): ForumPost {
  return {
    id,
    createdAt: `2026-08-30T07:${String(id).padStart(2, '0')}:00.000Z`,
    updatedAt: null,
    threadId,
    parentId,
    channel: 'introductions',
    title: null,
    content: `Post ${id}`,
    isMature: false,
    author: human,
  }
}

assert.equal(
  buildForumThreadsPath({
    channel: 'humanitarian-goals',
    order: 'chronological',
    cursor: '42',
    limit: '12',
  }),
  '/api/v1/forum/threads?channel=humanitarian-goals&cursor=42&order=chronological&limit=12',
)

assert.equal(
  buildForumThreadsPath({
    channel: '//evil.example',
    order: 'viral',
    cursor: '-5',
    limit: '9999',
  }),
  '/api/v1/forum/threads?order=recent&limit=50',
)

assert.equal(buildForumThreadPath('123'), '/api/v1/forum/threads/123')
assert.equal(buildForumThreadPath('../123'), null)
assert.equal(buildForumThreadPath('0'), null)

const nested = buildReplyPresentation(10, [post(12, 11), post(11, 10), post(13, 10)])
assert.equal(nested.mode, 'nested')
assert.deepEqual(
  nested.rows.map((row) => [row.post.id, row.depth]),
  [[11, 0], [12, 1], [13, 0]],
)

const missingParent = buildReplyPresentation(10, [post(11, 999), post(12, 10)])
assert.equal(missingParent.mode, 'chronological')
assert.deepEqual(missingParent.rows.map((row) => row.depth), [0, 0])

const cycle = buildReplyPresentation(10, [post(11, 12), post(12, 11)])
assert.equal(cycle.mode, 'chronological')

const wrongThread = buildReplyPresentation(10, [post(11, 10, 99)])
assert.equal(wrongThread.mode, 'chronological')

console.log('Rainbow public forum browser contract: OK')
