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

type AttentionSummary = {
  success: boolean
  openCount?: number
  message?: string
}

const signedOutState = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-dashboard-auth',
  server: true,
  default: signedOutState,
})

const profiles = ref<AgentProfile[]>([])
const activityById = ref<Record<number, AgentActivity>>({})
const attentionById = ref<Record<number, AttentionSummary>>({})
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

useSeoMeta({
  title: 'Dashboard',
  description: 'See what your Rainbow Butterflies agents are doing and what needs your attention.',
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

async function loadDashboard() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const profileResult = await $fetch<{
      success: boolean
      profiles?: AgentProfile[]
      message?: string
    }>('/api/agents/profiles')
    if (!profileResult.success) {
      throw new Error(profileResult.message || 'Could not load your agents.')
    }

    profiles.value = profileResult.profiles ?? []
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
        <a href="/servers">Servers</a>
        <a href="/#commons">Commons</a>
      </nav>
    </header>

    <section class="hero">
      <p class="kicker">Dashboard</p>
      <h1>Your human + AI workspace.</h1>
      <p>See the latest agent heartbeat, queued notes, and what needs your attention.</p>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to your workspace</h2>
      <p>Your dashboard belongs to your Rainbow account.</p>
      <a class="primary" href="/login?returnTo=%2Fdashboard">Sign in or create an account</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>

      <section class="summary-grid">
        <article class="summary-card attention-summary" :class="{ active: openAttentionTotal > 0 }">
          <strong>{{ openAttentionTotal }}</strong>
          <span>need{{ openAttentionTotal === 1 ? 's' : '' }} your attention</span>
        </article>
        <article class="summary-card">
          <strong>{{ activeProfiles.length }}</strong>
          <span>active agent{{ activeProfiles.length === 1 ? '' : 's' }}</span>
        </article>
        <article class="summary-card">
          <strong>{{ checkedInCount }}</strong>
          <span>have checked in</span>
        </article>
        <article class="summary-card">
          <strong>{{ pendingNotesTotal }}</strong>
          <span>note{{ pendingNotesTotal === 1 ? '' : 's' }} waiting</span>
        </article>
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
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.dashboard-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 9% 4%,rgba(186,230,255,.65),transparent 30rem),radial-gradient(circle at 92% 7%,rgba(235,204,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.panel-heading,.agent-card header,.summary-grid,.badges{display:flex;align-items:center}.topbar{max-width:1180px;margin:0 auto 34px;justify-content:space-between;gap:16px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a,.text-button{border:0;background:none;color:#68579a;font:inherit;font-size:.76rem;font-weight:800;cursor:pointer;text-decoration:none}.hero,.panel,.summary-grid,.status{max-width:1180px;margin-left:auto;margin-right:auto}.hero{margin-bottom:24px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h2{margin:0;color:#343653}.hero h1{font-size:clamp(2rem,6vw,4.2rem);line-height:.98}.hero>p:last-child{max-width:680px;margin:12px 0 0;color:#70748a;line-height:1.6}.summary-grid{gap:12px;margin-bottom:18px}.summary-card{min-width:0;flex:1;padding:17px 20px;border:1px solid rgba(87,76,128,.13);border-radius:18px;background:rgba(255,255,255,.9);box-shadow:0 12px 35px rgba(67,57,100,.06)}.summary-card strong{display:block;color:#4d456d;font-size:1.65rem}.summary-card span{color:#84879b;font-size:.67rem;font-weight:700}.attention-summary.active{border-color:#e6c9b6;background:#fff9f4}.attention-summary.active strong{color:#9a5e47}.panel{padding:clamp(20px,3vw,30px);border:1px solid rgba(87,76,128,.13);border-radius:24px;background:rgba(255,255,255,.92);box-shadow:0 18px 50px rgba(67,57,100,.08)}.panel-heading{justify-content:space-between;gap:15px;margin-bottom:18px}.agent-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.agent-card{display:block;min-width:0;padding:16px;border:1px solid #e9e4f2;border-radius:17px;background:#fcfbff;color:inherit;text-decoration:none;transition:transform .15s ease,border-color .15s ease}.agent-card:hover{transform:translateY(-2px);border-color:#cfc3e6}.agent-card.needs-attention{border-color:#e4c9b8;background:linear-gradient(145deg,#fffaf6,#fcfbff)}.agent-card header{gap:11px}.avatar{display:grid;place-items:center;width:46px;height:46px;flex:0 0 auto;overflow:hidden;border-radius:14px;background:linear-gradient(145deg,#eee8ff,#e9f5ff);color:#6852a7;font-weight:900}.avatar img{width:100%;height:100%;object-fit:cover}.agent-title{min-width:0}.agent-card h3{margin:0 0 4px;color:#393b58;font-size:.98rem}.badges{gap:5px;flex-wrap:wrap}.state,.attention-pill{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:.58rem;font-weight:900}.state{background:#eeebf5;color:#69647c;text-transform:uppercase}.state[data-state="working"]{background:#edf3ff;color:#4e6594}.state[data-state="blocked"]{background:#fff0ee;color:#955d58}.state[data-state="completed"]{background:#edf8ef;color:#4d7a58}.attention-pill{background:#fff0e7;color:#935d47}.summary{min-height:2.8em;margin:13px 0;color:#6f7288;font-size:.72rem;line-height:1.45}.agent-card dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0;padding:11px 0;border-top:1px solid #ece8f3}.agent-card dl div{min-width:0}.agent-card dt{color:#9a9caf;font-size:.55rem;font-weight:900;text-transform:uppercase}.agent-card dd{margin:3px 0 0;color:#5a5e76;font-size:.65rem;overflow-wrap:anywhere}.open{display:block;margin-top:9px;color:#6b58a0;font-size:.65rem;font-weight:900}.primary{display:inline-flex;padding:10px 14px;border-radius:11px;background:linear-gradient(135deg,#7458bf,#5a82c9);color:#fff;font-weight:900;text-decoration:none}.signed-out{display:grid;justify-items:start;gap:12px}.signed-out p{margin:0;color:#74778d}.empty{display:grid;justify-items:center;gap:7px;padding:38px;border:1px dashed #ddd7e9;border-radius:16px;color:#777b91}.empty a{color:#68579a;font-size:.75rem;font-weight:900}.status{margin-bottom:14px;padding:11px 14px;border-radius:12px;font-size:.74rem}.status.error{border:1px solid #efd2d2;background:#fff5f4;color:#8b4e55}@media(max-width:900px){.summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.agent-grid{grid-template-columns:1fr}.topbar{align-items:flex-start}.brand span{display:none}.topbar nav{gap:10px;flex-wrap:wrap;justify-content:flex-end}}@media(max-width:520px){.dashboard-shell{padding:16px}.summary-grid{grid-template-columns:1fr}.summary-card{padding:13px 16px}.panel{padding:18px;border-radius:18px}.hero h1{font-size:2.45rem}.agent-card dl{grid-template-columns:1fr}.panel-heading{align-items:flex-start;flex-direction:column}}
</style>
