<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type CheckIn = {
  id: number
  createdAt: string
  status: string | null
  summary: string | null
}

type AgentNote = {
  id: number
  createdAt: string
  body: string
  deliveredAt: string | null
}

type AgentActivity = {
  success: boolean
  profile?: { id: number; name: string; isActive: boolean }
  lastCheckInAt?: string | null
  pendingNotes?: number
  checkIns?: CheckIn[]
  notes?: AgentNote[]
  message?: string
}

type AttentionRequest = {
  id: number
  createdAt: string
  kind: 'help' | 'approval' | 'decision' | 'review'
  title: string
  body: string | null
  clientKey: string
  status: 'OPEN' | 'APPROVED' | 'DECLINED' | 'RESOLVED'
  resolution: string | null
  resolvedAt: string | null
  deliveredAt: string | null
}

type AttentionResult = {
  success: boolean
  openCount?: number
  requests?: AttentionRequest[]
  message?: string
}

const route = useRoute()
const signedOutState = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-agent-activity-auth',
  server: true,
  default: signedOutState,
})

const profileId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
})
const activity = ref<AgentActivity | null>(null)
const attention = ref<AttentionResult | null>(null)
const loading = ref(false)
const sending = ref(false)
const resolvingId = ref<number | null>(null)
const noteBody = ref('')
const resolutionDrafts = ref<Record<number, string>>({})
const errorMessage = ref('')
const notice = ref('')

const latestCheckIn = computed(() => activity.value?.checkIns?.[0] ?? null)
const agentName = computed(() => activity.value?.profile?.name || 'Agent activity')
const openRequests = computed(() =>
  (attention.value?.requests ?? []).filter((request) => request.status === 'OPEN'),
)
const resolvedRequests = computed(() =>
  (attention.value?.requests ?? []).filter((request) => request.status !== 'OPEN').slice(0, 12),
)

useSeoMeta({
  title: () => agentName.value,
  description: 'Review agent check-ins, answer requests, and leave human notes for the next heartbeat.',
})

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string }; message?: string }
    return candidate.data?.message || candidate.message || fallback
  }
  return fallback
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString()
}

function requestKind(kind: AttentionRequest['kind']) {
  return {
    help: 'Help requested',
    approval: 'Approval requested',
    decision: 'Decision requested',
    review: 'Review requested',
  }[kind]
}

async function loadWorkspace() {
  if (!authState.value.authenticated || !profileId.value || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [activityResult, attentionResult] = await Promise.all([
      $fetch<AgentActivity>(`/api/agents/profiles/${profileId.value}/activity`),
      $fetch<AttentionResult>(`/api/agents/profiles/${profileId.value}/attention`),
    ])
    if (!activityResult.success) {
      throw new Error(activityResult.message || 'Could not load agent activity.')
    }
    if (!attentionResult.success) {
      throw new Error(attentionResult.message || 'Could not load attention requests.')
    }
    activity.value = activityResult
    attention.value = attentionResult
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not load agent workspace.')
  } finally {
    loading.value = false
  }
}

async function queueNote() {
  const body = noteBody.value.trim()
  if (!profileId.value || !body || sending.value) return
  sending.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const result = await $fetch<{ success: boolean; message?: string }>(
      `/api/agents/profiles/${profileId.value}/notes`,
      {
        method: 'POST',
        body: { body },
      },
    )
    if (!result.success) throw new Error(result.message || 'Could not queue note.')
    noteBody.value = ''
    notice.value = result.message || 'Note queued for the next check-in.'
    await loadWorkspace()
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not queue note.')
  } finally {
    sending.value = false
  }
}

async function resolveRequest(
  request: AttentionRequest,
  status: 'APPROVED' | 'DECLINED' | 'RESOLVED',
) {
  if (!profileId.value || resolvingId.value !== null) return
  resolvingId.value = request.id
  errorMessage.value = ''
  notice.value = ''
  try {
    const result = await $fetch<{ success: boolean; message?: string }>(
      `/api/agents/profiles/${profileId.value}/attention/${request.id}`,
      {
        method: 'PATCH',
        body: {
          status,
          resolution: resolutionDrafts.value[request.id]?.trim() || null,
        },
      },
    )
    if (!result.success) throw new Error(result.message || 'Could not resolve request.')
    delete resolutionDrafts.value[request.id]
    notice.value = result.message || 'Decision queued for the agent’s next check-in.'
    await loadWorkspace()
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not resolve attention request.')
  } finally {
    resolvingId.value = null
  }
}

onMounted(() => {
  void loadWorkspace()
})
</script>

<template>
  <main class="activity-shell">
    <header class="topbar">
      <a href="/" class="brand">
        <img :src="logoUrl" alt="" />
        <span>Rainbow Butterflies</span>
      </a>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/agents">Agents</a>
        <a href="/servers">Servers</a>
      </nav>
    </header>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h1>Sign in to see agent activity</h1>
      <a class="primary" :href="`/login?returnTo=${encodeURIComponent(route.fullPath)}`">Sign in</a>
    </section>

    <template v-else>
      <section class="hero">
        <a class="back" href="/dashboard">← Dashboard</a>
        <p class="kicker">Agent workspace</p>
        <h1>{{ agentName }}</h1>
        <p>Heartbeat history, human notes, and requests that need a decision from you.</p>
      </section>

      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>
      <div v-if="notice" class="status notice" role="status">{{ notice }}</div>

      <template v-if="activity?.success">
        <section class="summary-grid">
          <article class="summary-card attention-summary" :class="{ active: openRequests.length > 0 }">
            <span>Needs attention</span>
            <strong>{{ openRequests.length }}</strong>
          </article>
          <article class="summary-card">
            <span>Latest state</span>
            <strong class="state" :data-state="latestCheckIn?.status || 'waiting'">
              {{ latestCheckIn?.status || 'waiting' }}
            </strong>
          </article>
          <article class="summary-card">
            <span>Last check-in</span>
            <strong>{{ formatDate(activity.lastCheckInAt) }}</strong>
          </article>
          <article class="summary-card">
            <span>Notes waiting</span>
            <strong>{{ activity.pendingNotes ?? 0 }}</strong>
          </article>
        </section>

        <section v-if="openRequests.length" class="panel attention-panel">
          <header class="section-heading">
            <div>
              <p class="kicker">Needs you</p>
              <h2>Human attention</h2>
            </div>
            <span>{{ openRequests.length }} open</span>
          </header>

          <div class="request-list">
            <article v-for="request in openRequests" :key="request.id" class="request-card">
              <header>
                <div>
                  <span class="request-kind">{{ requestKind(request.kind) }}</span>
                  <h3>{{ request.title }}</h3>
                </div>
                <time>{{ formatDate(request.createdAt) }}</time>
              </header>
              <p v-if="request.body">{{ request.body }}</p>
              <textarea
                v-model="resolutionDrafts[request.id]"
                maxlength="5000"
                rows="3"
                placeholder="Optional response for the agent…"
              />
              <footer>
                <small>{{ resolutionDrafts[request.id]?.length ?? 0 }} / 5000</small>
                <div class="request-actions">
                  <button
                    v-if="request.kind === 'approval' || request.kind === 'decision'"
                    class="secondary approve"
                    type="button"
                    :disabled="resolvingId !== null"
                    @click="resolveRequest(request, 'APPROVED')"
                  >
                    Approve
                  </button>
                  <button
                    v-if="request.kind === 'approval' || request.kind === 'decision'"
                    class="secondary decline"
                    type="button"
                    :disabled="resolvingId !== null"
                    @click="resolveRequest(request, 'DECLINED')"
                  >
                    Decline
                  </button>
                  <button
                    class="secondary"
                    type="button"
                    :disabled="resolvingId !== null"
                    @click="resolveRequest(request, 'RESOLVED')"
                  >
                    Resolve
                  </button>
                </div>
              </footer>
            </article>
          </div>
        </section>

        <div class="workspace-grid">
          <section class="panel note-panel">
            <p class="kicker">Human → agent</p>
            <h2>Leave a note</h2>
            <p class="hint">It will be delivered automatically the next time this agent checks in.</p>
            <form @submit.prevent="queueNote">
              <textarea
                v-model="noteBody"
                maxlength="5000"
                rows="6"
                placeholder="Priorities, feedback, a question, something to investigate…"
              />
              <div class="note-actions">
                <small>{{ noteBody.length }} / 5000</small>
                <button class="primary" type="submit" :disabled="sending || !noteBody.trim()">
                  {{ sending ? 'Queueing…' : 'Send on next check-in' }}
                </button>
              </div>
            </form>
          </section>

          <section class="panel latest-panel">
            <p class="kicker">Latest heartbeat</p>
            <h2>{{ latestCheckIn ? formatDate(latestCheckIn.createdAt) : 'No check-ins yet' }}</h2>
            <p v-if="latestCheckIn?.summary" class="latest-summary">{{ latestCheckIn.summary }}</p>
            <p v-else class="hint">Once the agent uses its Rainbow key to check in, its latest summary will appear here.</p>
            <button class="text-button" type="button" :disabled="loading" @click="loadWorkspace">
              {{ loading ? 'Refreshing…' : 'Refresh workspace' }}
            </button>
          </section>
        </div>

        <section class="panel timeline-panel">
          <header class="section-heading">
            <div>
              <p class="kicker">Agent → human</p>
              <h2>Check-in history</h2>
            </div>
            <span>{{ activity.checkIns?.length ?? 0 }} recent</span>
          </header>

          <div v-if="!activity.checkIns?.length" class="empty">No heartbeat reports yet.</div>
          <ol v-else class="timeline">
            <li v-for="checkIn in activity.checkIns" :key="checkIn.id">
              <div class="timeline-meta">
                <span class="state small-state" :data-state="checkIn.status || 'waiting'">
                  {{ checkIn.status || 'check-in' }}
                </span>
                <time>{{ formatDate(checkIn.createdAt) }}</time>
              </div>
              <p>{{ checkIn.summary || 'Checked in without a summary.' }}</p>
            </li>
          </ol>
        </section>

        <section v-if="resolvedRequests.length" class="panel resolved-panel">
          <header class="section-heading">
            <div>
              <p class="kicker">Decisions</p>
              <h2>Resolved requests</h2>
            </div>
            <span>{{ resolvedRequests.length }} recent</span>
          </header>
          <div class="resolved-list">
            <article v-for="request in resolvedRequests" :key="request.id">
              <div>
                <strong>{{ request.title }}</strong>
                <span class="resolution-state" :data-state="request.status">{{ request.status.toLowerCase() }}</span>
              </div>
              <p v-if="request.resolution">{{ request.resolution }}</p>
              <footer>
                <time>{{ formatDate(request.resolvedAt) }}</time>
                <span :class="{ waiting: !request.deliveredAt }">
                  {{ request.deliveredAt ? `Agent received ${formatDate(request.deliveredAt)}` : 'Waiting for next check-in' }}
                </span>
              </footer>
            </article>
          </div>
        </section>

        <section class="panel notes-panel">
          <header class="section-heading">
            <div>
              <p class="kicker">Your notes</p>
              <h2>Delivery history</h2>
            </div>
            <span>{{ activity.notes?.length ?? 0 }} recent</span>
          </header>

          <div v-if="!activity.notes?.length" class="empty">You haven’t left this agent any notes yet.</div>
          <div v-else class="notes-list">
            <article v-for="note in activity.notes" :key="note.id">
              <p>{{ note.body }}</p>
              <footer>
                <time>{{ formatDate(note.createdAt) }}</time>
                <span :class="{ waiting: !note.deliveredAt }">
                  {{ note.deliveredAt ? `Delivered ${formatDate(note.deliveredAt)}` : 'Waiting for next check-in' }}
                </span>
              </footer>
            </article>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.activity-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 8% 4%,rgba(186,230,255,.65),transparent 28rem),radial-gradient(circle at 92% 8%,rgba(235,204,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.summary-grid,.note-actions,.section-heading,.timeline-meta,.notes-list footer,.request-card header,.request-card footer,.request-actions,.resolved-list>article>div,.resolved-list footer{display:flex;align-items:center}.topbar{max-width:1180px;margin:0 auto 34px;justify-content:space-between;gap:16px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a,.back,.text-button{border:0;background:none;color:#68579a;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer;text-decoration:none}.hero,.panel,.summary-grid,.status,.workspace-grid{max-width:1180px;margin-left:auto;margin-right:auto}.hero{margin-bottom:22px}.back{display:inline-block;margin-bottom:18px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h1,.panel h2{margin:0;color:#343653}.hero h1{font-size:clamp(2.1rem,6vw,4.4rem);line-height:.98}.hero>p:last-child,.hint{color:#73778c;line-height:1.55}.hero>p:last-child{max-width:670px;margin:11px 0 0}.summary-grid{gap:12px;margin-bottom:18px}.summary-card{min-width:0;flex:1;padding:16px 18px;border:1px solid rgba(87,76,128,.13);border-radius:17px;background:rgba(255,255,255,.9)}.summary-card>span{display:block;margin-bottom:5px;color:#999bad;font-size:.56rem;font-weight:900;text-transform:uppercase}.summary-card>strong{display:block;color:#50536d;font-size:.8rem;overflow-wrap:anywhere}.attention-summary.active{border-color:#e5c9b8;background:#fff9f4}.attention-summary.active>strong{color:#955e49;font-size:1.2rem}.state{display:inline-flex!important;width:max-content;padding:4px 8px;border-radius:999px;background:#eeebf5;color:#69647c!important;font-size:.65rem!important;text-transform:uppercase}.state[data-state="working"]{background:#edf3ff;color:#4e6594!important}.state[data-state="blocked"]{background:#fff0ee;color:#955d58!important}.state[data-state="completed"]{background:#edf8ef;color:#4d7a58!important}.workspace-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin-bottom:16px}.panel{padding:clamp(20px,3vw,28px);border:1px solid rgba(87,76,128,.13);border-radius:22px;background:rgba(255,255,255,.93);box-shadow:0 15px 45px rgba(67,57,100,.07)}.hint{margin:8px 0 15px;font-size:.72rem}.note-panel form{display:grid;gap:10px}.note-panel textarea,.request-card textarea{width:100%;min-width:0;padding:12px;border:1px solid #ded9eb;border-radius:12px;background:#fff;color:#353850;font:inherit;resize:vertical}.note-actions{justify-content:space-between;gap:10px}.note-actions small,.request-card footer small{color:#9a9caf;font-size:.6rem}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:11px;font:inherit;font-weight:900;cursor:pointer;text-decoration:none}.primary{padding:10px 14px;border:0;background:linear-gradient(135deg,#7458bf,#5a82c9);color:#fff}.secondary{padding:8px 11px;border:1px solid #ddd7ed;background:#fff;color:#66529d;font-size:.67rem}.secondary.approve{border-color:#cfe1d3;color:#4d7656}.secondary.decline{border-color:#e8d3d1;color:#955d58}.primary:disabled,.secondary:disabled,.text-button:disabled{cursor:wait;opacity:.55}.latest-summary{margin:13px 0 18px;color:#5e6279;font-size:.85rem;line-height:1.55}.attention-panel{margin-bottom:16px;border-color:#e7cdbc;background:linear-gradient(145deg,#fffaf7,#fff)}.section-heading{justify-content:space-between;gap:14px;margin-bottom:16px}.section-heading>span{color:#9a9caf;font-size:.63rem;font-weight:800}.request-list,.resolved-list{display:grid;gap:10px}.request-card{padding:15px;border:1px solid #ead8cc;border-radius:15px;background:#fff}.request-card header{align-items:flex-start;justify-content:space-between;gap:12px}.request-card h3{margin:4px 0 0;color:#46495f;font-size:.92rem}.request-kind{color:#9a604a;font-size:.58rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase}.request-card time,.resolved-list time{color:#9a9caf;font-size:.58rem}.request-card>p{margin:11px 0;color:#64687d;font-size:.74rem;line-height:1.5;white-space:pre-wrap}.request-card textarea{margin-top:10px;font-size:.73rem}.request-card footer{justify-content:space-between;gap:12px;margin-top:9px}.request-actions{gap:7px;flex-wrap:wrap;justify-content:flex-end}.timeline-panel,.resolved-panel,.notes-panel{margin-top:16px}.timeline{display:grid;gap:0;margin:0;padding:0;list-style:none}.timeline li{padding:14px 0;border-top:1px solid #ece8f3}.timeline li:first-child{border-top:0}.timeline-meta{justify-content:space-between;gap:10px}.timeline time,.notes-list time{color:#9a9caf;font-size:.6rem}.small-state{font-size:.55rem!important}.timeline p{margin:8px 0 0;color:#60647b;font-size:.75rem;line-height:1.5}.resolved-list article,.notes-list article{padding:13px;border:1px solid #ebe7f3;border-radius:13px;background:#fcfbff}.resolved-list>article>div{justify-content:space-between;gap:10px}.resolved-list strong{color:#555970;font-size:.72rem}.resolution-state{padding:3px 7px;border-radius:999px;background:#eef1f5;color:#626879;font-size:.54rem;font-weight:900;text-transform:uppercase}.resolution-state[data-state="APPROVED"]{background:#edf8ef;color:#4d7656}.resolution-state[data-state="DECLINED"]{background:#fff0ee;color:#955d58}.resolved-list p,.notes-list p{margin:9px 0 0;color:#5d6178;font-size:.74rem;line-height:1.5;white-space:pre-wrap}.resolved-list footer,.notes-list footer{justify-content:space-between;gap:12px;margin-top:9px}.resolved-list footer span,.notes-list footer span{color:#5d7d63;font-size:.58rem;font-weight:850}.resolved-list footer span.waiting,.notes-list footer span.waiting{color:#956f4f}.notes-list{display:grid;gap:9px;align-items:stretch}.empty{padding:26px;border:1px dashed #ddd7e9;border-radius:14px;color:#8a8d9f;text-align:center;font-size:.72rem}.status{margin-bottom:14px;padding:11px 14px;border-radius:12px;font-size:.74rem}.status.error{border:1px solid #efd2d2;background:#fff5f4;color:#8b4e55}.status.notice{border:1px solid #d5e7d8;background:#f4fff6;color:#477154}.signed-out{display:grid;justify-items:start;gap:12px}@media(max-width:850px){.workspace-grid{grid-template-columns:1fr}.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.activity-shell{padding:16px}.summary-grid{grid-template-columns:1fr}.topbar{align-items:flex-start}.brand span{display:none}.topbar nav{gap:10px;flex-wrap:wrap;justify-content:flex-end}.panel{padding:18px;border-radius:18px}.hero h1{font-size:2.5rem}.note-actions,.section-heading,.timeline-meta,.notes-list footer,.request-card header,.request-card footer,.resolved-list footer{align-items:flex-start;flex-direction:column}.request-actions{justify-content:flex-start}}
</style>
