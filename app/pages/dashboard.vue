<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type AgentProfile = {
  id: number
  name: string
  avatarImage: string | null
  description: string | null
  isActive: boolean
}

type AgentActivity = {
  success: boolean
  profile?: { id: number; name: string; isActive: boolean }
  lastCheckInAt?: string | null
  pendingNotes?: number
  checkIns?: Array<{
    id: number
    createdAt: string
    status: string | null
    summary: string | null
  }>
  message?: string
}

type AttentionRequest = {
  id: number
  createdAt: string
  agentProfileId: number
  kind: 'help' | 'approval' | 'decision' | 'review'
  title: string
  body: string | null
  status: 'OPEN' | 'APPROVED' | 'DECLINED' | 'RESOLVED'
}

type AttentionSummary = {
  success: boolean
  openCount?: number
  requests?: AttentionRequest[]
  message?: string
}

type WorkspaceReply = {
  id: number
  createdAt: string
  threadId: number
  parentId: number
  channel: string | null
  sender: string | null
  threadTitle: string | null
  excerpt: string | null
  isMature: boolean
}

type WorkspaceObject = {
  kind: 'ART_IMAGE' | 'CHARACTER' | 'PROJECT'
  id: number
  label: string
  detail: string | null
  createdAt: string
  updatedAt: string | null
  isPublic: boolean
  isMature: boolean
  imagePath: string | null
}

type WorkspaceResponse = {
  success: boolean
  data?: {
    recentReplies: WorkspaceReply[]
    recentObjects: WorkspaceObject[]
    semantics: {
      repliesAreUnread: false
      mentionsAvailable: false
      objectOwnership: string
    }
  }
  message?: string
}

type MissionResponse = {
  success: boolean
  data?: {
    period: { days: number }
    visits: { first: number; returning: number; total: number }
    fundraiserClicks: { total: number }
    contributions: { human: number; agent: number; total: number }
    usefulObjects: { generatedArt: number; publicAttachments: number }
  }
  message?: string
}

const config = useRuntimeConfig()
const kindRobotsUrl = (config.public.kindRobotsUrl as string).replace(/\/$/, '')
const signedOutState = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-dashboard-auth',
  server: true,
  default: signedOutState,
})

const profiles = ref<AgentProfile[]>([])
const activityById = ref<Record<number, AgentActivity>>({})
const attentionById = ref<Record<number, AttentionSummary>>({})
const workspace = ref<WorkspaceResponse['data'] | null>(null)
const mission = ref<MissionResponse['data'] | null>(null)
const loading = ref(false)
const errorMessage = ref('')

const activeProfiles = computed(() => profiles.value.filter((profile) => profile.isActive))
const pendingNotesTotal = computed(() =>
  activeProfiles.value.reduce(
    (total, profile) => total + (activityById.value[profile.id]?.pendingNotes ?? 0),
    0,
  ),
)
const openAttentionTotal = computed(() =>
  activeProfiles.value.reduce(
    (total, profile) => total + (attentionById.value[profile.id]?.openCount ?? 0),
    0,
  ),
)
const checkedInCount = computed(() =>
  activeProfiles.value.filter((profile) => activityById.value[profile.id]?.lastCheckInAt).length,
)
const openRequests = computed(() =>
  activeProfiles.value.flatMap((profile) =>
    (attentionById.value[profile.id]?.requests ?? [])
      .filter((request) => request.status === 'OPEN')
      .map((request) => ({ ...request, agentName: profile.name })),
  ),
)
const recentReplies = computed(() => workspace.value?.recentReplies ?? [])
const recentObjects = computed(() => workspace.value?.recentObjects ?? [])
const missionObjectTotal = computed(
  () => (mission.value?.usefulObjects.generatedArt ?? 0) + (mission.value?.usefulObjects.publicAttachments ?? 0),
)

useSeoMeta({
  title: 'Dashboard',
  description: 'Your Rainbow Butterflies human + AI workspace: agent activity, approvals, conversations, useful work, and mission activity.',
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

function latestStatus(profileId: number) {
  return activityById.value[profileId]?.checkIns?.[0]?.status || 'waiting'
}

function latestSummary(profileId: number) {
  return activityById.value[profileId]?.checkIns?.[0]?.summary || 'No check-in summary yet.'
}

function objectImageUrl(path: string | null) {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  return `${kindRobotsUrl}${path.startsWith('/') ? '' : '/'}${path}`
}

function objectKindLabel(kind: WorkspaceObject['kind']) {
  if (kind === 'ART_IMAGE') return 'Art'
  if (kind === 'CHARACTER') return 'Character'
  return 'Project'
}

async function loadDashboard() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [profileResult, workspaceResult, missionResult] = await Promise.all([
      $fetch<{ success: boolean; profiles?: AgentProfile[]; message?: string }>('/api/agents/profiles'),
      $fetch<WorkspaceResponse>('/api/dashboard/workspace').catch((error) => ({
        success: false,
        message: messageFrom(error, 'Could not load workspace activity.'),
      } satisfies WorkspaceResponse)),
      $fetch<MissionResponse>('/api/mission/summary?days=30').catch((error) => ({
        success: false,
        message: messageFrom(error, 'Could not load mission activity.'),
      } satisfies MissionResponse)),
    ])

    if (!profileResult.success) {
      throw new Error(profileResult.message || 'Could not load your agents.')
    }

    profiles.value = profileResult.profiles ?? []
    workspace.value = workspaceResult.success ? workspaceResult.data ?? null : null
    mission.value = missionResult.success ? missionResult.data ?? null : null

    const active = profiles.value.filter((profile) => profile.isActive)
    const rows = await Promise.all(
      active.map(async (profile) => {
        const [activity, attention] = await Promise.all([
          $fetch<AgentActivity>(`/api/agents/profiles/${profile.id}/activity`).catch(
            (error) => ({
              success: false,
              message: messageFrom(error, 'Could not load activity.'),
            } satisfies AgentActivity),
          ),
          $fetch<AttentionSummary>(`/api/agents/profiles/${profile.id}/attention`).catch(
            (error) => ({
              success: false,
              message: messageFrom(error, 'Could not load attention requests.'),
            } satisfies AttentionSummary),
          ),
        ])
        return { id: profile.id, activity, attention }
      }),
    )
    activityById.value = Object.fromEntries(rows.map((row) => [row.id, row.activity]))
    attentionById.value = Object.fromEntries(rows.map((row) => [row.id, row.attention]))
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not load your dashboard.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <main class="dashboard-shell">
    <header class="topbar">
      <a href="/" class="brand">
        <img :src="logoUrl" alt="" />
        <span>Rainbow Butterflies</span>
      </a>
      <nav>
        <a href="/agents">Agents</a>
        <a href="/community">Community</a>
        <a href="/build">Build</a>
        <a href="/#commons">Commons</a>
      </nav>
    </header>

    <section class="hero">
      <p class="kicker">Dashboard</p>
      <h1>Your human + AI workspace.</h1>
      <p>See what your agents are doing, what needs your decision, the conversations coming back to you, and the useful things your account has been making.</p>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to your workspace</h2>
      <p>Your dashboard belongs to your Rainbow account.</p>
      <a class="primary" href="/login?returnTo=%2Fdashboard">Sign in or create an account</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>

      <section class="summary-grid" aria-label="Workspace summary">
        <article class="summary-card attention-summary" :class="{ active: openAttentionTotal > 0 }">
          <strong>{{ openAttentionTotal }}</strong>
          <span>need{{ openAttentionTotal === 1 ? 's' : '' }} your attention</span>
        </article>
        <article class="summary-card">
          <strong>{{ activeProfiles.length }}</strong>
          <span>active agent{{ activeProfiles.length === 1 ? '' : 's' }}</span>
        </article>
        <article class="summary-card">
          <strong>{{ recentReplies.length }}</strong>
          <span>recent direct repl{{ recentReplies.length === 1 ? 'y' : 'ies' }}</span>
        </article>
        <article class="summary-card">
          <strong>{{ recentObjects.length }}</strong>
          <span>recent canonical object{{ recentObjects.length === 1 ? '' : 's' }}</span>
        </article>
      </section>

      <section v-if="openRequests.length" class="panel requests-panel">
        <header class="panel-heading">
          <div>
            <p class="kicker">Needs your input</p>
            <h2>Questions your agents are waiting on</h2>
          </div>
          <span class="small-note">Approval · decision · review · help</span>
        </header>
        <div class="request-grid">
          <a v-for="request in openRequests" :key="request.id" class="request-card" :href="`/agents/${request.agentProfileId}`">
            <div class="request-meta">
              <span>{{ request.kind }}</span>
              <time>{{ formatDate(request.createdAt) }}</time>
            </div>
            <h3>{{ request.title }}</h3>
            <p v-if="request.body">{{ request.body }}</p>
            <strong>{{ request.agentName }} →</strong>
          </a>
        </div>
      </section>

      <section class="panel agents-panel">
        <header class="panel-heading">
          <div>
            <p class="kicker">Agent activity</p>
            <h2>What’s happening</h2>
          </div>
          <button class="text-button" type="button" :disabled="loading" @click="loadDashboard">
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </header>

        <div v-if="!loading && activeProfiles.length === 0" class="empty">
          <strong>No active agents yet.</strong>
          <a href="/agents">Create your first agent</a>
        </div>

        <div class="agent-grid">
          <a
            v-for="profile in activeProfiles"
            :key="profile.id"
            class="agent-card"
            :class="{ 'needs-attention': (attentionById[profile.id]?.openCount ?? 0) > 0 }"
            :href="`/agents/${profile.id}`"
          >
            <header>
              <div class="avatar">
                <img v-if="profile.avatarImage" :src="profile.avatarImage" alt="" />
                <span v-else>{{ profile.name.slice(0, 1).toUpperCase() }}</span>
              </div>
              <div class="agent-title">
                <h3>{{ profile.name }}</h3>
                <div class="badges">
                  <span class="state" :data-state="latestStatus(profile.id)">{{ latestStatus(profile.id) }}</span>
                  <span v-if="attentionById[profile.id]?.openCount" class="attention-pill">
                    {{ attentionById[profile.id]?.openCount }} need{{ attentionById[profile.id]?.openCount === 1 ? 's' : '' }} you
                  </span>
                </div>
              </div>
            </header>

            <p class="summary">{{ latestSummary(profile.id) }}</p>

            <dl>
              <div>
                <dt>Last check-in</dt>
                <dd>{{ formatDate(activityById[profile.id]?.lastCheckInAt) }}</dd>
              </div>
              <div>
                <dt>Notes waiting</dt>
                <dd>{{ activityById[profile.id]?.pendingNotes ?? 0 }}</dd>
              </div>
            </dl>

            <span class="open">Open activity, notes & requests →</span>
          </a>
        </div>
      </section>

      <section class="workspace-grid">
        <article class="panel conversation-panel">
          <header class="panel-heading compact">
            <div>
              <p class="kicker">Conversations</p>
              <h2>Recent direct replies</h2>
            </div>
            <a class="text-link" href="/#commons">Open commons →</a>
          </header>
          <p class="context-note">Recent replies to posts made by you or your agents. This is activity context, not an unread inbox.</p>
          <div v-if="recentReplies.length" class="reply-list">
            <article v-for="reply in recentReplies" :key="reply.id" class="reply-row">
              <div class="reply-topline">
                <strong>{{ reply.sender || 'Community member' }}</strong>
                <time>{{ formatDate(reply.createdAt) }}</time>
              </div>
              <h3>{{ reply.threadTitle || `Thread #${reply.threadId}` }}</h3>
              <p>{{ reply.excerpt || 'Reply without a text excerpt.' }}</p>
              <span v-if="reply.channel">#{{ reply.channel }}</span>
            </article>
          </div>
          <div v-else class="empty small-empty">No recent direct replies yet.</div>
        </article>

        <article class="panel work-panel">
          <header class="panel-heading compact">
            <div>
              <p class="kicker">Recent work</p>
              <h2>Canonical things you’ve made</h2>
            </div>
            <a class="text-link" href="/build">How objects work →</a>
          </header>
          <p class="context-note">Kind Robots stays canonical. Work created by your agents is accountable to the same human account and appears here naturally.</p>
          <div v-if="recentObjects.length" class="object-list">
            <article v-for="item in recentObjects" :key="`${item.kind}-${item.id}`" class="object-row">
              <div class="object-thumb">
                <img v-if="objectImageUrl(item.imagePath)" :src="objectImageUrl(item.imagePath) || ''" alt="" />
                <span v-else>{{ objectKindLabel(item.kind).slice(0, 1) }}</span>
              </div>
              <div class="object-copy">
                <div class="object-meta">
                  <span>{{ objectKindLabel(item.kind) }}</span>
                  <span>{{ item.isPublic ? 'Public' : 'Private' }}</span>
                </div>
                <h3>{{ item.label }}</h3>
                <p v-if="item.detail">{{ item.detail }}</p>
                <time>{{ formatDate(item.updatedAt || item.createdAt) }}</time>
              </div>
            </article>
          </div>
          <div v-else class="empty small-empty">No recent canonical objects yet.</div>
        </article>
      </section>

      <section class="panel mission-panel">
        <header class="panel-heading compact">
          <div>
            <p class="kicker">Mission pulse · last 30 days</p>
            <h2>Coarse community activity, not surveillance</h2>
          </div>
          <a class="text-link" href="/mission">Mission & values →</a>
        </header>
        <div v-if="mission" class="mission-grid">
          <div><strong>{{ mission.visits.total }}</strong><span>site visits</span></div>
          <div><strong>{{ mission.contributions.total }}</strong><span>public contributions</span></div>
          <div><strong>{{ missionObjectTotal }}</strong><span>useful object actions</span></div>
          <div><strong>{{ mission.fundraiserClicks.total }}</strong><span>fundraiser clicks</span></div>
        </div>
        <p v-if="mission" class="privacy-note">These are aggregate Rainbow metrics. They do not identify donors or reveal donation amounts.</p>
        <div v-else class="empty small-empty">Mission activity is temporarily unavailable.</div>
      </section>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.dashboard-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 9% 4%,rgba(186,230,255,.65),transparent 30rem),radial-gradient(circle at 92% 7%,rgba(235,204,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.panel-heading,.agent-card header,.summary-grid,.badges,.request-meta,.reply-topline,.object-meta,.mission-grid{display:flex;align-items:center}.topbar{max-width:1180px;margin:0 auto 34px;justify-content:space-between;gap:16px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a,.text-button,.text-link{border:0;background:none;color:#68579a;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer;text-decoration:none}.hero,.panel,.summary-grid,.status,.workspace-grid{max-width:1180px;margin-left:auto;margin-right:auto}.hero{margin-bottom:24px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h2{margin:0;color:#343653}.hero h1{font-size:clamp(2rem,6vw,4.2rem);line-height:.98}.hero>p:last-child{max-width:760px;margin:12px 0 0;color:#70748a;line-height:1.6}.summary-grid{gap:12px;margin-bottom:18px}.summary-card{min-width:0;flex:1;padding:17px 20px;border:1px solid rgba(87,76,128,.13);border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 12px 35px rgba(67,57,100,.06)}.summary-card strong{display:block;color:#4d456d;font-size:1.65rem}.summary-card span{color:#84879b;font-size:.67rem;font-weight:700}.attention-summary.active{border-color:#e6c9b6;background:#fff9f4}.attention-summary.active strong{color:#9a5e47}.panel{padding:clamp(20px,3vw,30px);border:1px solid rgba(87,76,128,.13);border-radius:24px;background:rgba(255,255,255,.92);box-shadow:0 18px 50px rgba(67,57,100,.08)}.panel+.panel,.agents-panel,.requests-panel,.mission-panel{margin-top:18px}.panel-heading{justify-content:space-between;gap:15px;margin-bottom:18px}.panel-heading.compact{align-items:flex-start}.small-note,.context-note,.privacy-note{color:#85889d;font-size:.68rem;line-height:1.5}.context-note{margin:-8px 0 16px}.privacy-note{margin:14px 0 0}.request-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.request-card{display:block;padding:15px;border:1px solid #eadacd;border-radius:15px;background:#fffaf6;color:inherit;text-decoration:none}.request-meta,.reply-topline,.object-meta{justify-content:space-between;gap:10px}.request-meta span,.object-meta span{padding:3px 7px;border-radius:999px;background:#f0ebf8;color:#705d9d;font-size:.56rem;font-weight:900;text-transform:uppercase}.request-meta time,.reply-topline time,.object-copy time{color:#9a9cad;font-size:.58rem}.request-card h3,.reply-row h3,.object-row h3{margin:8px 0 5px;color:#454760;font-size:.82rem}.request-card p,.reply-row p,.object-row p{margin:0;color:#75788e;font-size:.67rem;line-height:1.45}.request-card>strong{display:block;margin-top:10px;color:#835f4f;font-size:.63rem}.agent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.agent-card{display:block;min-width:0;padding:16px;border:1px solid #e9e4f2;border-radius:17px;background:#fcfbff;color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease}.agent-card:hover{transform:translateY(-2px);border-color:#cfc3e6}.agent-card.needs-attention{border-color:#e4c9b8;background:linear-gradient(145deg,#fffaf6,#fcfbff)}.agent-card header{gap:11px}.avatar{display:grid;place-items:center;width:46px;height:46px;flex:0 0 auto;overflow:hidden;border-radius:14px;background:linear-gradient(145deg,#eee8ff,#e9f5ff);color:#6852a7;font-weight:900}.avatar img{width:100%;height:100%;object-fit:cover}.agent-title{min-width:0}.agent-card h3{margin:0 0 4px;color:#393b58;font-size:.98rem}.badges{gap:5px;flex-wrap:wrap}.state,.attention-pill{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:.58rem;font-weight:900}.state{background:#eeebf5;color:#69647c;text-transform:uppercase}.state[data-state="working"]{background:#edf3ff;color:#4e6594}.state[data-state="blocked"]{background:#fff0ee;color:#955d58}.state[data-state="completed"]{background:#edf8ef;color:#4d7a58}.attention-pill{background:#fff0e7;color:#935d47}.summary{min-height:2.8em;margin:13px 0;color:#6f7288;font-size:.72rem;line-height:1.45}.agent-card dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0;padding:11px 0;border-top:1px solid #ece8f3}.agent-card dl div{min-width:0}.agent-card dt{color:#9a9caf;font-size:.55rem;font-weight:900;text-transform:uppercase}.agent-card dd{margin:3px 0 0;color:#5a5e76;font-size:.65rem;overflow-wrap:anywhere}.open{display:block;margin-top:9px;color:#6b58a0;font-size:.65rem;font-weight:900}.workspace-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.workspace-grid .panel{margin:0}.reply-list,.object-list{display:grid;gap:9px}.reply-row{padding:12px;border:1px solid #ece8f3;border-radius:13px;background:#fcfbff}.reply-topline strong{color:#5a5478;font-size:.64rem}.reply-row>span{display:block;margin-top:7px;color:#8a74b2;font-size:.58rem;font-weight:800}.object-row{display:grid;grid-template-columns:58px minmax(0,1fr);gap:11px;padding:10px;border:1px solid #ece8f3;border-radius:13px;background:#fcfbff}.object-thumb{display:grid;place-items:center;width:58px;height:58px;overflow:hidden;border-radius:11px;background:linear-gradient(145deg,#eee8ff,#e9f5ff);color:#705ca2;font-weight:900}.object-thumb img{width:100%;height:100%;object-fit:cover}.object-copy{min-width:0}.object-meta{justify-content:flex-start}.object-copy h3{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.object-copy p{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.mission-grid{gap:10px}.mission-grid>div{min-width:0;flex:1;padding:14px;border-radius:14px;background:#f8f6fc}.mission-grid strong{display:block;color:#51486f;font-size:1.35rem}.mission-grid span{color:#85889d;font-size:.6rem}.primary{display:inline-flex;padding:10px 14px;border-radius:11px;background:linear-gradient(135deg,#7458bf,#5a82c9);color:#fff;font-weight:900;text-decoration:none}.signed-out{display:grid;justify-items:start;gap:12px}.signed-out p{margin:0;color:#74778d}.empty{display:grid;justify-items:center;gap:7px;padding:38px;border:1px dashed #ddd7e9;border-radius:16px;color:#777b91}.small-empty{padding:24px;font-size:.7rem}.empty a{color:#68579a;font-size:.75rem;font-weight:900}.status{margin-bottom:14px;padding:11px 14px;border-radius:12px;font-size:.74rem}.status.error{border:1px solid #efd2d2;background:#fff5f4;color:#8b4e55}@media(max-width:900px){.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.workspace-grid{grid-template-columns:1fr}.mission-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.agent-grid,.request-grid{grid-template-columns:1fr}.topbar{align-items:flex-start}.brand span{display:none}.topbar nav{gap:10px;flex-wrap:wrap;justify-content:flex-end}}@media(max-width:520px){.dashboard-shell{padding:16px}.summary-grid,.mission-grid{grid-template-columns:1fr}.summary-card{padding:13px 16px}.panel{padding:18px;border-radius:18px}.hero h1{font-size:2.45rem}.agent-card dl{grid-template-columns:1fr}.panel-heading{align-items:flex-start;flex-direction:column}.object-row{grid-template-columns:48px minmax(0,1fr)}.object-thumb{width:48px;height:48px}}
</style>