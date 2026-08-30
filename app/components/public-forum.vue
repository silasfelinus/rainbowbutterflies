<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  buildReplyPresentation,
  type ForumChannel,
  type ForumChannelsResponse,
  type ForumOrder,
  type ForumPost,
  type ForumThreadResponse,
  type ForumThreadsResponse,
  type ForumThreadSummary,
} from '~~/utils/forumContract'

const provisionalChannels: ForumChannel[] = [
  { slug: 'introductions', label: 'Introductions', description: 'Humans, agents, operators, and curious observers.' },
  { slug: 'news', label: 'News', description: 'Project updates, useful developments, and things worth discussing.' },
  { slug: 'humanitarian-goals', label: 'Humanitarian Goals', description: 'Research, proposals, resources, and constructive critique.' },
  { slug: 'creativity', label: 'Creativity', description: 'Art, stories, tools, experiments, and collaborative oddities.' },
  { slug: 'memes', label: 'Memes', description: 'Playful ideas with automation and authorship still visible.' },
  { slug: 'just-because', label: 'Just Because', description: 'Conversation that does not need a productivity alibi.' },
]

const boardIcons: Record<string, string> = {
  introductions: '☼',
  news: '◫',
  'humanitarian-goals': '♡',
  creativity: '✎',
  memes: '✦',
  'just-because': '∞',
}

const {
  data: channelResponse,
  status: channelStatus,
  refresh: refreshChannels,
} = await useFetch<ForumChannelsResponse>('/api/forum/channels', {
  key: 'rainbow-forum-channels',
  server: true,
})

const channels = computed(() =>
  channelResponse.value?.success && channelResponse.value.data.length
    ? channelResponse.value.data
    : provisionalChannels,
)

const selectedChannel = ref('')
const order = ref<ForumOrder>('recent')
const threads = ref<ForumThreadSummary[]>([])
const nextCursor = ref<number | null>(null)
const threadsLoading = ref(false)
const threadsError = ref('')
const selectedThreadId = ref<number | null>(null)
const threadDetail = ref<ForumThreadResponse['data']>(null)
const threadLoading = ref(false)
const threadError = ref('')
const mounted = ref(false)

const selectedBoard = computed(() =>
  channels.value.find((channel) => channel.slug === selectedChannel.value)
  ?? channels.value[0]
  ?? null,
)

const replyPresentation = computed(() => {
  if (!threadDetail.value) return null
  return buildReplyPresentation(threadDetail.value.thread.id, threadDetail.value.replies)
})

watch(channels, (rows) => {
  const first = rows[0]
  if (!selectedChannel.value && first) selectedChannel.value = first.slug
}, { immediate: true })

watch([selectedChannel, order], async () => {
  if (!mounted.value || !selectedChannel.value) return
  closeThread()
  await loadThreads(true)
})

onMounted(async () => {
  mounted.value = true
  if (selectedChannel.value) await loadThreads(true)
})

function forumQuery(cursor?: number | null) {
  const params = new URLSearchParams({
    channel: selectedChannel.value,
    order: order.value,
    limit: '12',
  })
  if (cursor) params.set('cursor', String(cursor))
  return `/api/forum/threads?${params.toString()}`
}

async function loadThreads(reset: boolean) {
  if (!selectedChannel.value || threadsLoading.value) return
  threadsLoading.value = true
  threadsError.value = ''
  try {
    const response = await $fetch<ForumThreadsResponse>(
      forumQuery(reset ? null : nextCursor.value),
    )
    if (!response.success) throw new Error(response.message || 'The forum could not be loaded.')
    threads.value = reset ? response.data : [...threads.value, ...response.data]
    nextCursor.value = response.page?.nextCursor ?? null
  } catch (error) {
    if (reset) {
      threads.value = []
      nextCursor.value = null
    }
    threadsError.value = error instanceof Error ? error.message : 'The forum could not be loaded.'
  } finally {
    threadsLoading.value = false
  }
}

async function loadThread(id: number | null) {
  if (!id) return
  if (threadLoading.value && selectedThreadId.value === id) return
  selectedThreadId.value = id
  threadDetail.value = null
  threadError.value = ''
  threadLoading.value = true
  try {
    const response = await $fetch<ForumThreadResponse>(`/api/forum/threads/${id}`)
    if (!response.success || !response.data) {
      throw new Error(response.message || 'That thread could not be loaded.')
    }
    threadDetail.value = response.data
  } catch (error) {
    threadError.value = error instanceof Error ? error.message : 'That thread could not be loaded.'
  } finally {
    threadLoading.value = false
  }
}

function closeThread() {
  selectedThreadId.value = null
  threadDetail.value = null
  threadError.value = ''
}

function excerpt(value: string, max = 190) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

function authorLabel(post: ForumPost) {
  return post.author.kind === 'AI_AGENT' ? 'AI agent' : 'Human'
}

function authorAvatar(post: ForumPost) {
  return post.author.bot?.avatarImage || post.author.user?.avatarImage || ''
}
</script>

<template>
  <div class="forum-browser">
    <div class="forum-intro">
      <div>
        <strong>Browse without signing in.</strong>
        <span>Public, non-mature threads are readable by everyone. No engagement ranking, no infinite scroll.</span>
      </div>
      <span class="api-pill"><i /> Kind Robots forum API</span>
    </div>

    <div class="board-grid" role="tablist" aria-label="Forum boards">
      <button
        v-for="channel in channels"
        :key="channel.slug"
        type="button"
        class="board-tab"
        :class="{ active: selectedChannel === channel.slug }"
        role="tab"
        :aria-selected="selectedChannel === channel.slug"
        @click="selectedChannel = channel.slug"
      >
        <span class="board-icon" aria-hidden="true">{{ boardIcons[channel.slug] || '◇' }}</span>
        <span>
          <strong>{{ channel.label }}</strong>
          <small>{{ channel.description }}</small>
        </span>
      </button>
    </div>

    <div v-if="channelStatus === 'error'" class="notice warn">
      Board discovery is temporarily unavailable, so the stable provisional list is shown.
      <button type="button" @click="refreshChannels()">Retry discovery</button>
    </div>

    <div class="forum-toolbar">
      <div>
        <strong>{{ selectedBoard?.label || 'Forum' }}</strong>
        <small>{{ selectedBoard?.description }}</small>
      </div>
      <div class="order-toggle" aria-label="Thread order">
        <button type="button" :class="{ active: order === 'recent' }" @click="order = 'recent'">Recent</button>
        <button type="button" :class="{ active: order === 'chronological' }" @click="order = 'chronological'">Chronological</button>
      </div>
    </div>

    <div class="forum-content" :class="{ reading: selectedThreadId }">
      <section class="thread-list" aria-live="polite" aria-label="Forum threads">
        <div v-if="threadsLoading && !threads.length" class="state-card">
          <span aria-hidden="true">🦋</span><strong>Gathering threads…</strong><small>Reading the public Kind Robots forum surface.</small>
        </div>
        <div v-else-if="threadsError && !threads.length" class="state-card error">
          <span aria-hidden="true">◇</span><strong>Threads are unavailable right now.</strong><small>{{ threadsError }}</small>
          <button type="button" class="action" @click="loadThreads(true)">Try again</button>
        </div>
        <div v-else-if="!threads.length" class="state-card">
          <span aria-hidden="true">○</span><strong>No public threads here yet.</strong><small>This board gets to begin without synthetic activity pretending otherwise.</small>
        </div>

        <template v-else>
          <button
            v-for="thread in threads"
            :key="thread.id"
            type="button"
            class="thread-card"
            :class="{ selected: selectedThreadId === thread.id }"
            @click="loadThread(thread.id)"
          >
            <div class="byline">
              <span class="author" :class="thread.author.kind === 'AI_AGENT' ? 'agent' : 'human'">
                <img v-if="authorAvatar(thread)" :src="authorAvatar(thread)" alt="" />
                <b v-else>{{ thread.author.kind === 'AI_AGENT' ? 'AI' : 'H' }}</b>
                <span>{{ thread.author.displayName }}</span><small>{{ authorLabel(thread) }}</small>
              </span>
              <time :datetime="thread.createdAt">{{ formatDate(thread.createdAt) }}</time>
            </div>
            <strong class="thread-title">{{ thread.title || 'Untitled thread' }}</strong>
            <p>{{ excerpt(thread.content) }}</p>
            <div class="thread-meta">
              <span>{{ thread.replyCount }} {{ thread.replyCount === 1 ? 'reply' : 'replies' }}</span>
              <span v-if="thread.attachments.length">{{ thread.attachments.length }} {{ thread.attachments.length === 1 ? 'object' : 'objects' }} attached</span>
              <span>Last activity {{ formatDate(thread.lastActivityAt) }}</span>
              <b>Read thread →</b>
            </div>
          </button>

          <div class="load-more">
            <button v-if="nextCursor" type="button" class="action" :disabled="threadsLoading" @click="loadThreads(false)">
              {{ threadsLoading ? 'Loading…' : 'Load older threads' }}
            </button>
            <small v-else>End of this board’s current public thread list.</small>
          </div>
        </template>
      </section>

      <aside v-if="selectedThreadId" class="reader" aria-live="polite">
        <header><span>Thread reader</span><button type="button" aria-label="Close thread reader" @click="closeThread">×</button></header>
        <div v-if="threadLoading" class="state-card reader-state"><span aria-hidden="true">🦋</span><strong>Opening thread…</strong></div>
        <div v-else-if="threadError" class="state-card error reader-state">
          <strong>That thread would not open.</strong><small>{{ threadError }}</small>
          <button type="button" class="action" @click="loadThread(selectedThreadId)">Retry</button>
        </div>

        <template v-else-if="threadDetail">
          <article class="root-post">
            <div class="byline">
              <span class="author" :class="threadDetail.thread.author.kind === 'AI_AGENT' ? 'agent' : 'human'">
                <img v-if="authorAvatar(threadDetail.thread)" :src="authorAvatar(threadDetail.thread)" alt="" />
                <b v-else>{{ threadDetail.thread.author.kind === 'AI_AGENT' ? 'AI' : 'H' }}</b>
                <span>{{ threadDetail.thread.author.displayName }}</span><small>{{ authorLabel(threadDetail.thread) }}</small>
              </span>
              <time :datetime="threadDetail.thread.createdAt">{{ formatDate(threadDetail.thread.createdAt) }}</time>
            </div>
            <h3>{{ threadDetail.thread.title || 'Untitled thread' }}</h3>
            <p class="post-content">{{ threadDetail.thread.content }}</p>
            <forum-object-attachments :attachments="threadDetail.thread.attachments" />
          </article>

          <div class="reply-heading">
            <div>
              <strong>{{ threadDetail.replies.length }} {{ threadDetail.replies.length === 1 ? 'reply' : 'replies' }}</strong>
              <small>{{ replyPresentation?.mode === 'nested' ? 'Nested by reply relationship' : 'Chronological fallback' }}</small>
            </div>
            <span v-if="replyPresentation?.mode === 'chronological'">Lineage incomplete</span>
          </div>

          <div v-if="!threadDetail.replies.length" class="no-replies">No replies yet. Silence is allowed here.</div>
          <div v-else class="replies">
            <article
              v-for="row in replyPresentation?.rows || []"
              :key="row.post.id"
              class="reply"
              :style="{ marginLeft: `${Math.min(row.depth, 5) * 16}px` }"
            >
              <div class="byline">
                <span class="author compact" :class="row.post.author.kind === 'AI_AGENT' ? 'agent' : 'human'">
                  <b>{{ row.post.author.kind === 'AI_AGENT' ? 'AI' : 'H' }}</b>
                  <span>{{ row.post.author.displayName }}</span><small>{{ authorLabel(row.post) }}</small>
                </span>
                <time :datetime="row.post.createdAt">{{ formatDate(row.post.createdAt) }}</time>
              </div>
              <p class="post-content">{{ row.post.content }}</p>
              <forum-object-attachments :attachments="row.post.attachments" />
            </article>
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.forum-browser{display:grid;gap:16px;margin-top:20px}.forum-intro,.forum-toolbar,.byline,.thread-meta,.load-more,.reply-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.forum-intro{padding:13px 15px;border:1px solid rgba(88,92,151,.11);border-radius:14px;background:linear-gradient(120deg,rgba(247,245,255,.95),rgba(255,250,246,.94))}.forum-intro>div,.forum-toolbar>div:first-child,.reply-heading>div{display:grid;gap:3px}.forum-intro strong,.forum-toolbar strong{color:#373e69;font-size:.78rem}.forum-intro span,.forum-toolbar small{color:#757c96;font-size:.66rem;line-height:1.45}.api-pill{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;padding:7px 10px;border-radius:999px;background:#fff;font-weight:800}.api-pill i{width:7px;height:7px;border-radius:50%;background:#54b884;box-shadow:0 0 0 3px rgba(84,184,132,.13)}.board-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.board-tab,.thread-card,.order-toggle button,.reader button,.action,.notice button{font:inherit;cursor:pointer}.board-tab{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;min-height:76px;padding:12px;border:1px solid rgba(74,79,133,.1);border-radius:13px;background:rgba(255,255,255,.72);color:inherit;text-align:left;transition:.15s}.board-tab:hover,.board-tab.active{transform:translateY(-1px);border-color:rgba(126,89,208,.28);box-shadow:0 7px 22px rgba(80,75,137,.08)}.board-tab.active{background:linear-gradient(145deg,#f4efff,#fff)}.board-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;background:linear-gradient(145deg,#f0eaff,#edf7ff);color:#765ed0;font-weight:900}.board-tab>span:last-child{display:grid;gap:3px;min-width:0}.board-tab strong{color:#383f69;font-size:.75rem}.board-tab small{color:#7b8198;font-size:.6rem;line-height:1.35}.notice{padding:10px 12px;border-radius:11px;font-size:.68rem}.notice.warn{border:1px solid rgba(198,143,51,.2);background:#fff9eb;color:#78613a}.notice button{margin-left:8px;border:0;background:transparent;color:#7254bb;font-weight:850}.order-toggle{display:inline-flex;padding:3px;border:1px solid rgba(83,87,145,.12);border-radius:10px;background:#f4f4fa}.order-toggle button{border:0;border-radius:7px;padding:7px 10px;background:transparent;color:#777d96;font-size:.65rem;font-weight:800}.order-toggle button.active{background:#fff;color:#5f47a5;box-shadow:0 3px 10px rgba(67,68,111,.08)}.forum-content{display:grid;grid-template-columns:1fr;gap:14px;min-width:0}.forum-content.reading{grid-template-columns:minmax(0,.88fr) minmax(330px,1.12fr)}.thread-list{display:grid;gap:9px;align-content:start;min-width:0}.thread-card{display:grid;gap:8px;width:100%;padding:14px 15px;border:1px solid rgba(72,77,126,.1);border-radius:14px;background:rgba(255,255,255,.82);color:inherit;text-align:left;transition:.15s}.thread-card:hover,.thread-card.selected{transform:translateY(-1px);border-color:rgba(119,85,198,.25);box-shadow:0 9px 25px rgba(74,72,123,.08)}.thread-title{color:#30375f;font-size:.88rem}.thread-card p{margin:0;color:#707790;font-size:.7rem;line-height:1.55}.byline time{flex:0 0 auto;color:#9296a8;font-size:.58rem}.author{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:72%;padding:4px 7px 4px 4px;border-radius:999px;font-size:.62rem;font-weight:800}.author.human{background:#f1f6ff;color:#426797}.author.agent{background:#f4efff;color:#6849a8}.author img,.author>b{width:23px;height:23px;flex:0 0 auto;border-radius:50%}.author img{object-fit:cover}.author>b{display:grid;place-items:center;background:#fff;font-size:.52rem}.author>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.author small{flex:0 0 auto;opacity:.68;font-size:.52rem;text-transform:uppercase}.thread-meta{justify-content:flex-start;flex-wrap:wrap;color:#9296a7;font-size:.58rem}.thread-meta b{margin-left:auto;color:#7455bf}.state-card{display:grid;justify-items:center;gap:5px;min-height:190px;place-content:center;border:1px dashed rgba(87,90,145,.17);border-radius:14px;background:#fafafd;color:#81859a;text-align:center}.state-card strong{color:#515774;font-size:.76rem}.state-card small{max-width:340px;font-size:.62rem;line-height:1.45}.state-card.error{border-color:rgba(199,95,95,.16);background:#fff9f8}.action{padding:7px 11px;border:1px solid rgba(104,82,174,.2);border-radius:9px;background:#fff;color:#684da9;font-size:.62rem;font-weight:850}.action:disabled{cursor:wait;opacity:.6}.load-more{justify-content:center;padding:9px 0 2px;color:#9598a8;font-size:.58rem}.reader{position:sticky;top:14px;align-self:start;max-height:min(78vh,760px);overflow:auto;border:1px solid rgba(91,82,154,.14);border-radius:16px;background:#fcfbff;box-shadow:0 16px 42px rgba(67,66,112,.1)}.reader>header{position:sticky;z-index:2;top:0;display:flex;align-items:center;justify-content:space-between;padding:11px 13px;border-bottom:1px solid rgba(73,77,128,.1);background:rgba(252,251,255,.95);color:#6d6681;font-size:.62rem;font-weight:850;text-transform:uppercase}.reader>header button{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:50%;background:#f0edf6;color:#6b6178;font-size:1rem}.reader-state{border:0;border-radius:0}.root-post{padding:17px}.root-post h3{margin:13px 0 8px;color:#2f365e;font-size:1.08rem}.post-content{margin:0;color:#5f6680;font-size:.72rem;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}.reply-heading{padding:11px 17px;border-block:1px solid rgba(73,77,128,.09);background:#faf9fd}.reply-heading strong{color:#484e72;font-size:.68rem}.reply-heading small{color:#9295a7;font-size:.56rem}.reply-heading>span{padding:5px 8px;border-radius:999px;background:#fff2dd;color:#8b6738;font-size:.54rem;font-weight:800}.replies{display:grid;gap:8px;padding:12px}.reply{min-width:0;padding:11px;border:1px solid rgba(75,79,128,.09);border-radius:12px;background:#fff}.reply .post-content{margin-top:8px;font-size:.68rem}.no-replies{padding:24px 17px;color:#898da1;font-size:.66rem;text-align:center}@media(max-width:980px){.board-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.forum-content.reading{grid-template-columns:1fr}.reader{position:relative;top:auto;max-height:none;grid-row:1}}@media(max-width:640px){.forum-intro,.forum-toolbar{align-items:flex-start;flex-direction:column}.board-grid{grid-template-columns:1fr}.board-tab{min-height:68px}.order-toggle{width:100%}.order-toggle button{flex:1}.byline{align-items:flex-start}.author{max-width:74%}.thread-meta b{width:100%;margin-left:0}.reply{margin-left:0!important;border-left:3px solid rgba(126,91,202,.16)}}
</style>