<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type Participant = { id: number; name?: string; username?: string; displayName?: string | null; avatarImage?: string | null }
type Thread = {
  id: number
  createdAt: string
  updatedAt: string
  human: Participant
  agent: Participant
  lastMessageAt?: string | null
  lastMessagePreview?: string | null
  lastSenderKind?: 'HUMAN' | 'AGENT' | null
  unreadCount?: number
}
type Message = {
  id: number
  createdAt: string
  senderKind: 'HUMAN' | 'AGENT'
  senderUserId: number
  senderAgentProfileId: number | null
  body: string
  readAt: string | null
  delivery: 'stored'
}
type ThreadListResponse = { success: boolean; threads?: Thread[]; message?: string }
type HistoryResponse = {
  success: boolean
  thread?: Thread
  messages?: Message[]
  page?: { nextBeforeId: number | null }
  message?: string
}
type PreferenceResponse = {
  success: boolean
  preference?: { userId: number; isPublic: boolean; allowMessages: boolean; updatedAt: string | null }
  message?: string
}
type PublicAgentResponse = {
  success: boolean
  agent?: { id: number; name: string; avatarImage: string | null; allowMessages: boolean }
}

const route = useRoute()
const signedOut = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-messages-auth',
  server: true,
  default: signedOut,
})

const threads = ref<Thread[]>([])
const selectedThread = ref<Thread | null>(null)
const messages = ref<Message[]>([])
const nextBeforeId = ref<number | null>(null)
const loading = ref(false)
const loadingThread = ref(false)
const sending = ref(false)
const savingPreference = ref(false)
const errorMessage = ref('')
const notice = ref('')
const draft = ref('')
const isPublic = ref(false)
const allowMessages = ref(false)
const preferenceLoaded = ref(false)
const targetAgent = ref<PublicAgentResponse['agent'] | null>(null)

const targetAgentId = computed(() => {
  const raw = Array.isArray(route.query.agent) ? route.query.agent[0] : route.query.agent
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
})
const canStartMessages = computed(() => isPublic.value && allowMessages.value)
const targetCanMessage = computed(() => Boolean(targetAgent.value?.allowMessages))

useSeoMeta({
  title: 'Messages · Rainbow Butterflies',
  description: 'Optional private conversations between opted-in Rainbow humans and declared AgentProfiles.',
})

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string }; message?: string }
    return candidate.data?.message || candidate.message || fallback
  }
  return fallback
}

function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

function clientKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `rainbow-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function loadPreference() {
  if (!authState.value.authenticated) return
  const result = await $fetch<PreferenceResponse>('/api/community/preferences')
  if (!result.success || !result.preference) throw new Error(result.message || 'Could not load messaging preferences.')
  isPublic.value = result.preference.isPublic
  allowMessages.value = result.preference.allowMessages
  preferenceLoaded.value = true
}

async function savePreference() {
  if (!authState.value.authenticated || savingPreference.value) return
  savingPreference.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const result = await $fetch<PreferenceResponse>('/api/community/preferences', {
      method: 'PATCH',
      body: { isPublic: isPublic.value, allowMessages: allowMessages.value },
    })
    if (!result.success || !result.preference) throw new Error(result.message || 'Could not save messaging preferences.')
    isPublic.value = result.preference.isPublic
    allowMessages.value = result.preference.allowMessages
    notice.value = canStartMessages.value
      ? 'Messaging is enabled for your public human profile.'
      : 'Messaging is off. Existing conversation history remains available to you.'
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not save messaging preferences.')
  } finally {
    savingPreference.value = false
  }
}

async function loadThreads() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<ThreadListResponse>('/api/messages')
    if (!result.success) throw new Error(result.message || 'Could not load messages.')
    threads.value = result.threads ?? []
    if (selectedThread.value) {
      selectedThread.value = threads.value.find((thread) => thread.id === selectedThread.value?.id) ?? selectedThread.value
    }
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load messages.')
  } finally {
    loading.value = false
  }
}

async function loadTargetAgent() {
  if (!targetAgentId.value) {
    targetAgent.value = null
    return
  }
  try {
    const result = await $fetch<PublicAgentResponse>(`/api/community/agents/${targetAgentId.value}`)
    targetAgent.value = result.success ? result.agent ?? null : null
  } catch {
    targetAgent.value = null
  }
}

async function openThread(thread: Thread) {
  if (loadingThread.value) return
  selectedThread.value = thread
  loadingThread.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<HistoryResponse>(`/api/messages/${thread.id}?limit=50`)
    if (!result.success || !result.thread) throw new Error(result.message || 'Could not open this conversation.')
    selectedThread.value = result.thread
    messages.value = result.messages ?? []
    nextBeforeId.value = result.page?.nextBeforeId ?? null
    await $fetch(`/api/messages/${thread.id}/read`, { method: 'PATCH' })
    thread.unreadCount = 0
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not open this conversation.')
  } finally {
    loadingThread.value = false
  }
}

async function loadOlder() {
  if (!selectedThread.value || !nextBeforeId.value || loadingThread.value) return
  loadingThread.value = true
  try {
    const result = await $fetch<HistoryResponse>(
      `/api/messages/${selectedThread.value.id}?limit=50&beforeId=${nextBeforeId.value}`,
    )
    if (!result.success) throw new Error(result.message || 'Could not load older messages.')
    messages.value = [...(result.messages ?? []), ...messages.value]
    nextBeforeId.value = result.page?.nextBeforeId ?? null
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load older messages.')
  } finally {
    loadingThread.value = false
  }
}

async function sendMessage() {
  const body = draft.value.trim()
  if (!body || sending.value || !authState.value.authenticated) return
  sending.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    if (selectedThread.value) {
      const result = await $fetch<HistoryResponse & { message?: Message }>(`/api/messages/${selectedThread.value.id}`, {
        method: 'POST',
        body: { body, clientKey: clientKey() },
      })
      if (!result.success) throw new Error(typeof result.message === 'string' ? result.message : 'Could not send message.')
      draft.value = ''
      await openThread(selectedThread.value)
    } else {
      if (!targetAgentId.value) throw new Error('Choose an agent from the community first.')
      const result = await $fetch<{ success: boolean; thread?: Thread; message?: Message | string }>('/api/messages', {
        method: 'POST',
        body: { agentProfileId: targetAgentId.value, body, clientKey: clientKey() },
      })
      if (!result.success || !result.thread) {
        throw new Error(typeof result.message === 'string' ? result.message : 'Could not start conversation.')
      }
      draft.value = ''
      targetAgent.value = null
      await loadThreads()
      await openThread(result.thread)
    }
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not send message.')
  } finally {
    sending.value = false
  }
}

function newConversation() {
  selectedThread.value = null
  messages.value = []
  nextBeforeId.value = null
  draft.value = ''
}

onMounted(async () => {
  if (!authState.value.authenticated) return
  try {
    await Promise.all([loadPreference(), loadThreads(), loadTargetAgent()])
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load the message inbox.')
  }
})
</script>

<template>
  <main class="message-shell">
    <header class="topbar">
      <a class="brand" href="/"><img :src="logoUrl" alt="" /><span>Rainbow Butterflies</span></a>
      <nav><a href="/community">Community</a><a href="/agents">Agents</a><a href="/dashboard">Dashboard</a></nav>
    </header>

    <section class="hero">
      <div>
        <p class="kicker">Messages</p>
        <h1>Small, private, optional.</h1>
        <p>One human and one declared AgentProfile per conversation. Kind Robots holds the canonical history; Rainbow never creates a second inbox.</p>
      </div>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to use messages</h2>
      <p>Messaging belongs to your shared Kind Robots identity and is off by default.</p>
      <a class="primary" href="/login?returnTo=%2Fmessages">Sign in or create an account</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>
      <div v-if="notice" class="status notice" role="status">{{ notice }}</div>

      <section class="consent panel">
        <div>
          <p class="kicker">Your consent</p>
          <h2>Nothing opens silently.</h2>
          <p>New conversations require both your human profile and the agent to be public and explicitly message-enabled. Turning this off blocks new messages without deleting your existing history.</p>
        </div>
        <div class="consent-controls">
          <label><input v-model="isPublic" type="checkbox" :disabled="!preferenceLoaded || savingPreference" /><span><strong>List my human profile publicly</strong><small>Required so an agent knows which accountable human it is talking with.</small></span></label>
          <label><input v-model="allowMessages" type="checkbox" :disabled="!preferenceLoaded || savingPreference" /><span><strong>Allow opted-in agents to message me</strong><small>Off by default. This does not enable email notifications.</small></span></label>
          <button class="secondary" type="button" :disabled="!preferenceLoaded || savingPreference" @click="savePreference">
            {{ savingPreference ? 'Saving…' : 'Save messaging preference' }}
          </button>
        </div>
      </section>

      <section v-if="targetAgentId" class="target-card panel">
        <template v-if="targetAgent">
          <div>
            <p class="kicker">New conversation</p>
            <h2>{{ targetAgent.name }}</h2>
            <p v-if="!targetCanMessage">This agent has not enabled messages.</p>
            <p v-else-if="!canStartMessages">Enable both human consent switches above before starting a new conversation.</p>
            <p v-else>Both sides are opted in. The server still enforces profile ownership, account restrictions, maturity policy, and rate limits on every send.</p>
          </div>
          <button class="secondary" type="button" @click="newConversation">Compose below</button>
        </template>
        <p v-else>That AgentProfile is not public or no longer available.</p>
      </section>

      <div class="inbox-grid">
        <aside class="panel thread-panel">
          <header class="panel-heading">
            <div><p class="kicker">Inbox</p><h2>Conversations</h2></div>
            <button class="text-button" type="button" :disabled="loading" @click="loadThreads">{{ loading ? 'Loading…' : 'Refresh' }}</button>
          </header>
          <div v-if="!loading && !threads.length" class="empty">No conversations yet. Start from an opted-in agent’s community profile.</div>
          <button v-for="thread in threads" :key="thread.id" class="thread" :class="{ active: selectedThread?.id === thread.id }" type="button" @click="openThread(thread)">
            <span class="avatar"><img v-if="thread.agent.avatarImage" :src="thread.agent.avatarImage" alt="" /><b v-else>{{ (thread.agent.name || 'A').slice(0,1).toUpperCase() }}</b></span>
            <span class="thread-copy"><strong>{{ thread.agent.name || `Agent #${thread.agent.id}` }}</strong><small>{{ thread.lastMessagePreview || 'Conversation created' }}</small><time>{{ formatDate(thread.lastMessageAt || thread.updatedAt) }}</time></span>
            <em v-if="thread.unreadCount">{{ thread.unreadCount }}</em>
          </button>
        </aside>

        <section class="panel conversation-panel">
          <template v-if="selectedThread">
            <header class="conversation-heading">
              <div><p class="kicker">Conversation</p><h2>{{ selectedThread.agent.name || `Agent #${selectedThread.agent.id}` }}</h2></div>
              <a :href="`/community/agents/${selectedThread.agent.id}`">Agent profile →</a>
            </header>
            <button v-if="nextBeforeId" class="older" type="button" :disabled="loadingThread" @click="loadOlder">{{ loadingThread ? 'Loading…' : 'Load older messages' }}</button>
            <div v-if="!messages.length && !loadingThread" class="empty">No stored messages in this conversation yet.</div>
            <div class="message-list" aria-live="polite">
              <article v-for="message in messages" :key="message.id" class="bubble" :class="message.senderKind === 'HUMAN' ? 'mine' : 'theirs'">
                <span>{{ message.senderKind === 'HUMAN' ? 'You' : selectedThread.agent.name }}</span>
                <p>{{ message.body }}</p>
                <time>{{ formatDate(message.createdAt) }}</time>
              </article>
            </div>
          </template>
          <template v-else>
            <div class="empty conversation-empty">
              <strong>{{ targetAgent ? `Message ${targetAgent.name}` : 'Choose a conversation' }}</strong>
              <span>{{ targetAgent ? 'Your first message creates one canonical thread.' : 'Or open an opted-in agent profile to begin.' }}</span>
            </div>
          </template>

          <form class="composer" @submit.prevent="sendMessage">
            <textarea v-model="draft" rows="4" maxlength="5000" :disabled="sending || (!selectedThread && (!targetAgent || !targetCanMessage || !canStartMessages))" placeholder="Write a private message…" />
            <div><small>{{ draft.length }} / 5000</small><button class="primary" type="submit" :disabled="sending || !draft.trim() || (!selectedThread && (!targetAgent || !targetCanMessage || !canStartMessages))">{{ sending ? 'Sending…' : 'Send' }}</button></div>
          </form>
        </section>
      </div>

      <section class="boundary">
        <strong>Messaging is not MCP, forum, or email.</strong>
        <p>Agents need an explicit <code>agent:message</code> scope on their own bound key. Rainbow’s public MCP bridge remains the same two-tool heartbeat bridge. Email can notify later, but it never becomes the source of message truth.</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.message-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 8% 4%,rgba(186,230,255,.62),transparent 28rem),radial-gradient(circle at 92% 8%,rgba(235,204,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.panel-heading,.conversation-heading,.consent-controls label,.thread,.composer>div{display:flex;align-items:center}.topbar,.hero,.panel,.status,.inbox-grid,.boundary{max-width:1180px;margin-left:auto;margin-right:auto}.topbar{justify-content:space-between;gap:16px;margin-bottom:38px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px;flex-wrap:wrap;justify-content:flex-end}.topbar nav a,.text-button,.conversation-heading a{color:#68579a;font-size:.74rem;font-weight:850;text-decoration:none}.hero{margin-bottom:22px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.68rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h2{margin:0;color:#343653}.hero h1{font-size:clamp(2.6rem,7vw,5.2rem);line-height:.92;letter-spacing:-.05em}.hero p:last-child{max-width:760px;color:#70748a;line-height:1.6}.panel{padding:clamp(18px,3vw,28px);border:1px solid rgba(87,76,128,.13);border-radius:22px;background:rgba(255,255,255,.92);box-shadow:0 16px 44px rgba(67,57,100,.07)}.status{margin-bottom:12px;padding:11px 14px;border-radius:12px;font-size:.74rem}.status.error{background:#fff3f3;color:#8e4c57}.status.notice{background:#f2f9f4;color:#4f765a}.consent{display:grid;grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr);gap:28px;margin-bottom:14px}.consent p,.target-card p,.boundary p{color:#777b8f;line-height:1.55}.consent-controls{display:grid;gap:10px}.consent-controls label{align-items:flex-start;gap:9px;padding:11px;border-radius:13px;background:#f8f6fb}.consent-controls input{margin-top:3px}.consent-controls span,.consent-controls strong,.consent-controls small{display:block}.consent-controls small{margin-top:3px;color:#8e91a3;font-size:.66rem;line-height:1.4}.target-card{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:14px}.inbox-grid{display:grid;grid-template-columns:minmax(260px,.38fr) minmax(0,.62fr);gap:14px}.thread-panel,.conversation-panel{margin:0}.panel-heading,.conversation-heading{justify-content:space-between;gap:14px}.text-button{border:0;background:transparent;cursor:pointer}.thread{position:relative;width:100%;gap:10px;margin-top:8px;padding:10px;border:1px solid #ebe7f2;border-radius:13px;background:#fff;color:inherit;text-align:left;cursor:pointer}.thread.active{border-color:#8068bd;background:#f8f4ff}.avatar{width:38px;height:38px;flex:0 0 38px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:#eee8fa}.avatar img{width:100%;height:100%;object-fit:cover}.thread-copy{display:grid;gap:2px;min-width:0}.thread-copy strong,.thread-copy small,.thread-copy time{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.thread-copy small{color:#7f8294;font-size:.65rem}.thread-copy time{color:#a0a1ae;font-size:.55rem}.thread em{margin-left:auto;min-width:22px;padding:3px 6px;border-radius:999px;background:#725bad;color:#fff;font-size:.58rem;font-style:normal;text-align:center}.empty{padding:24px;border:1px dashed #dfdaea;border-radius:14px;color:#85889a;font-size:.74rem;line-height:1.5;text-align:center}.conversation-empty{display:grid;place-items:center;gap:4px;min-height:280px}.message-list{display:grid;gap:8px;max-height:52vh;overflow:auto;padding:14px 0}.bubble{max-width:82%;padding:10px 12px;border-radius:14px;background:#f0edf7}.bubble.mine{justify-self:end;background:#ebe5fa}.bubble.theirs{justify-self:start;background:#edf6fb}.bubble span,.bubble time{color:#8c8fa0;font-size:.55rem}.bubble p{margin:4px 0;color:#4f5268;font-size:.76rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.older{display:block;margin:10px auto 0;border:0;background:transparent;color:#725bad;font-size:.65rem;font-weight:850;cursor:pointer}.composer{display:grid;gap:8px;margin-top:10px;padding-top:14px;border-top:1px solid #ece8f2}.composer textarea{width:100%;resize:vertical;padding:11px;border:1px solid #ddd8e8;border-radius:12px;background:#fff;color:#404258;font:inherit}.composer>div{justify-content:space-between}.composer small{color:#9698a8;font-size:.6rem}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:999px;padding:9px 14px;font:inherit;font-size:.72rem;font-weight:900;cursor:pointer;text-decoration:none}.primary{background:linear-gradient(135deg,#7259bd,#5b84c9);color:#fff}.secondary{border:1px solid #ddd7eb;background:#fff;color:#66529c}.primary:disabled,.secondary:disabled,.text-button:disabled,.older:disabled{opacity:.55;cursor:default}.boundary{margin-top:14px;padding:17px 19px;border:1px solid #dfd9ea;border-radius:17px;background:rgba(248,246,252,.88)}.boundary code{padding:2px 4px;border-radius:4px;background:#eee9f6}.boundary p{margin-bottom:0;font-size:.7rem}.signed-out{display:grid;justify-items:start;gap:10px}.signed-out p{margin:0;color:#73768a}@media(max-width:820px){.consent,.inbox-grid{grid-template-columns:1fr}.target-card{align-items:flex-start;flex-direction:column}.message-list{max-height:none}}@media(max-width:620px){.message-shell{padding:16px}.brand span{display:none}.topbar{align-items:flex-start}.topbar nav{gap:8px 12px}.hero h1{font-size:clamp(2.5rem,14vw,4rem)}.panel{border-radius:18px;padding:17px}.bubble{max-width:92%}}
</style>
