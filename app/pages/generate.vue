<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type Quota = {
  quotaDate: string
  resetsAt: string
  perHumanDaily: number
  userUsed: number
  userRemaining: number
  publicDailyPool: number
  publicUsed: number
  publicRemaining: number
  internalDailyReserve: number
  deferredForUser: number
  sharedAcrossAgents: boolean
}

type QuotaMode = 'RESOURCE_FREE' | 'FREE_QUOTA' | 'DEFERRED_FREE' | 'PAID_TOKENS'
type QuotaResponse = { success: boolean; quota?: Quota; message?: string }
type EnqueueResponse = {
  success: boolean
  message: string
  data?: {
    jobId: number
    status: string
    quotaMode: QuotaMode
    quota: Quota | null
    tokens: { charged: number }
  }
}
type JobData = {
  job: {
    id: number
    status: string
    artImageId: number | null
    error: string | null
  }
}
type JobResponse = { success: boolean; data?: JobData }
type ArtImageResponse = {
  success: boolean
  data?: {
    id: number
    fileType: string | null
    imageData: string | null
    thumbnailData: string | null
    promptString: string | null
    isPublic: boolean
    isMature: boolean
  } | null
}

const signedOut = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-generate-auth',
  server: true,
  default: signedOut,
})

const quota = ref<Quota | null>(null)
const prompt = ref('')
const isPublic = ref(true)
const isMature = ref(false)
const submitting = ref(false)
const message = ref('')
const errorMessage = ref('')
const job = ref<JobData | null>(null)
const quotaMode = ref<QuotaMode | null>(null)
const generatedImage = ref<NonNullable<ArtImageResponse['data']> | null>(null)
let pollTimer: ReturnType<typeof setTimeout> | null = null

const quotaPercent = computed(() => {
  if (!quota.value?.perHumanDaily) return 0
  return Math.min(100, Math.round((quota.value.userUsed / quota.value.perHumanDaily) * 100))
})
const resetLabel = computed(() => {
  if (!quota.value?.resetsAt) return ''
  return new Date(quota.value.resetsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
})
const jobStatus = computed(() => job.value?.job.status ?? '')
const complete = computed(() => jobStatus.value === 'DONE')
const failed = computed(() => ['FAILED', 'CANCELLED'].includes(jobStatus.value))
const imageSource = computed(() => {
  const raw = generatedImage.value?.imageData || generatedImage.value?.thumbnailData || ''
  if (!raw) return ''
  if (raw.startsWith('data:image/')) return raw
  const fileType = generatedImage.value?.fileType?.replace(/^\./, '') || 'png'
  return `data:image/${fileType};base64,${raw}`
})

useSeoMeta({
  title: 'Generate · Rainbow Butterflies',
  description: 'Generate Krea 2 art with a human-level daily free allowance and transparent queue capacity.',
})

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }; message?: string }
    return value.data?.message || value.message || fallback
  }
  return fallback
}

async function loadQuota() {
  if (!authState.value.authenticated) return
  try {
    const result = await $fetch<QuotaResponse>('/api/generate/krea2/quota')
    if (result.success && result.quota) quota.value = result.quota
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load Krea 2 allowance.')
  }
}

async function loadGeneratedImage(id: number) {
  try {
    const result = await $fetch<ArtImageResponse>(`/api/generate/images/${id}`)
    if (result.success && result.data) generatedImage.value = result.data
  } catch (error) {
    errorMessage.value = errorText(error, 'The image finished, but its preview could not be loaded.')
  }
}

async function pollJob(id: number) {
  if (pollTimer) clearTimeout(pollTimer)
  try {
    const result = await $fetch<JobResponse>(`/api/generate/jobs/${id}`)
    if (result.success && result.data) {
      job.value = result.data
      if (result.data.job.status === 'DONE' && result.data.job.artImageId) {
        await loadGeneratedImage(result.data.job.artImageId)
      }
    }
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not refresh generation status.')
  }
  if (!complete.value && !failed.value) {
    pollTimer = setTimeout(() => void pollJob(id), 3000)
  }
}

async function generate() {
  if (!authState.value.authenticated || submitting.value) return
  const value = prompt.value.trim()
  if (!value) {
    errorMessage.value = 'Describe what you want to create first.'
    return
  }

  submitting.value = true
  message.value = ''
  errorMessage.value = ''
  job.value = null
  quotaMode.value = null
  generatedImage.value = null
  try {
    const result = await $fetch<EnqueueResponse>('/api/generate/krea2/enqueue', {
      method: 'POST',
      body: {
        prompt: value,
        isPublic: isPublic.value,
        isMature: isMature.value,
      },
    })
    if (!result.success || !result.data) throw new Error(result.message || 'Generation failed.')
    message.value = result.message
    quotaMode.value = result.data.quotaMode
    if (result.data.quota) quota.value = result.data.quota
    job.value = {
      job: {
        id: result.data.jobId,
        status: result.data.status,
        artImageId: null,
        error: null,
      },
    }
    await pollJob(result.data.jobId)
    await loadQuota()
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not queue your image.')
  } finally {
    submitting.value = false
  }
}

if (authState.value.authenticated) await loadQuota()
onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer)
})
</script>

<template>
  <main class="generate-shell">
    <header class="topbar">
      <a class="brand" href="/"><img :src="logoUrl" alt="" /><span>Rainbow Butterflies</span></a>
      <nav><a href="/community">Community</a><a href="/#commons">Commons</a><a href="/dashboard">Dashboard</a></nav>
    </header>

    <section v-if="!authState.authenticated" class="signin-card">
      <p class="kicker">Generate</p>
      <h1>Make something useful, strange, or beautiful.</h1>
      <p>Your free Krea 2 allowance belongs to your shared human account, so sign in before generating.</p>
      <a class="primary" href="/login?returnTo=%2Fgenerate">Sign in or join →</a>
    </section>

    <template v-else>
      <section class="hero">
        <div>
          <p class="kicker">Krea 2 · shared public compute</p>
          <h1>Generate.</h1>
          <p>Ten free Krea 2 images per human each day. Your agents draw from the same allowance.</p>
        </div>
        <div v-if="quota" class="quota-card">
          <div class="quota-number"><strong>{{ quota.userRemaining }}</strong><span>free today</span></div>
          <div class="meter"><span :style="{ width: `${quotaPercent}%` }" /></div>
          <div class="quota-meta">
            <span>{{ quota.userUsed }} / {{ quota.perHumanDaily }} used</span>
            <span>resets {{ resetLabel }}</span>
          </div>
          <p v-if="quota.deferredForUser">{{ quota.deferredForUser }} free request{{ quota.deferredForUser === 1 ? '' : 's' }} waiting for public capacity.</p>
        </div>
      </section>

      <section class="studio">
        <div class="composer">
          <label for="prompt">What should we make?</label>
          <textarea id="prompt" v-model="prompt" maxlength="4000" placeholder="A joyful neighborhood tool library run by humans and helpful little robots, hand-painted poster style…" />
          <div class="choices">
            <label><input v-model="isPublic" type="checkbox" /> Share in public galleries</label>
            <label><input v-model="isMature" type="checkbox" /> Mature content</label>
          </div>
          <button class="primary" :disabled="submitting || !prompt.trim()" @click="generate">
            {{ submitting ? 'Queuing…' : 'Generate with Krea 2' }}
          </button>
          <p class="economy-note">Your daily allowance uses shared local compute, not paid tokens. After your 10 free images are used, additional Krea 2 work uses paid tokens. If the public free pool is full, free work waits in queue instead of silently charging you.</p>
        </div>

        <aside class="result-card" :class="{ 'has-image': Boolean(imageSource) }">
          <img v-if="imageSource" :src="imageSource" :alt="generatedImage?.promptString || prompt" class="generated-image" />
          <template v-if="job?.job">
            <div class="status-row"><span class="status-dot" :class="jobStatus.toLowerCase()" /><strong>{{ jobStatus }}</strong><small>Job #{{ job.job.id }}</small></div>
            <h2 v-if="complete">Generation complete.</h2>
            <h2 v-else-if="failed">This generation stopped.</h2>
            <h2 v-else-if="quotaMode === 'DEFERRED_FREE'">Waiting for a free capacity slot.</h2>
            <h2 v-else>Working through the queue.</h2>
            <p v-if="job.job.error" class="error">{{ job.job.error }}</p>
            <p v-else-if="complete && generatedImage">Saved as ArtImage #{{ generatedImage.id }} on your shared Kind Robots account.</p>
            <p v-else-if="complete">The image is saved as ArtImage #{{ job.job.artImageId }}. Loading its preview…</p>
            <p v-else>{{ message || 'Your request is queued.' }}</p>
          </template>
          <template v-else>
            <div class="empty-art" aria-hidden="true">✦</div>
            <h2>Your next image starts here.</h2>
            <p>Results stay attached to your canonical Kind Robots account. Rainbow is the friendly front door, not a second art database.</p>
          </template>
        </aside>
      </section>

      <p v-if="errorMessage" class="page-error">{{ errorMessage }}</p>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.generate-shell{min-height:100vh;padding:clamp(16px,3vw,42px);color:#3f4058;background:radial-gradient(circle at 15% 0,rgba(189,232,255,.62),transparent 30rem),radial-gradient(circle at 90% 12%,rgba(246,207,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.hero,.quota-meta,.choices,.status-row{display:flex;align-items:center}.topbar{max-width:1120px;margin:0 auto 38px;justify-content:space-between;gap:16px}.brand{gap:10px;color:inherit;font-weight:950;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a{color:#6b5a9e;font-size:.76rem;font-weight:850;text-decoration:none}.hero,.studio,.signin-card{max-width:1120px;margin-left:auto;margin-right:auto}.hero{justify-content:space-between;align-items:flex-end;gap:30px;margin-bottom:22px}.kicker{margin:0 0 7px;color:#7a5fc0;font-size:.68rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.hero h1,.signin-card h1{margin:0;font-size:clamp(3.2rem,10vw,7rem);line-height:.8;letter-spacing:-.065em}.hero>div>p:last-child,.signin-card>p{max-width:610px;color:#707388;line-height:1.6}.quota-card{width:min(330px,100%);padding:18px;border:1px solid rgba(91,76,136,.14);border-radius:22px;background:rgba(255,255,255,.9);box-shadow:0 15px 40px rgba(77,63,116,.07)}.quota-number strong,.quota-number span{display:block}.quota-number strong{font-size:2.4rem;line-height:1}.quota-number span{margin-top:3px;color:#85879a;font-size:.68rem;font-weight:850;text-transform:uppercase}.meter{height:9px;margin:14px 0 8px;overflow:hidden;border-radius:999px;background:#eeeaf5}.meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#76c6ff,#bd82e7)}.quota-meta{justify-content:space-between;gap:10px;color:#8c8e9e;font-size:.64rem}.quota-card p{margin:10px 0 0;color:#765b9f;font-size:.72rem}.studio{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:16px}.composer,.result-card,.signin-card{border:1px solid rgba(91,76,136,.14);border-radius:26px;background:rgba(255,255,255,.92);box-shadow:0 18px 55px rgba(70,57,108,.075)}.composer{padding:clamp(20px,4vw,34px)}.composer>label{display:block;margin-bottom:10px;font-weight:900}.composer textarea{width:100%;min-height:230px;resize:vertical;padding:17px;border:1px solid #ddd6e9;border-radius:18px;background:#fff;color:#41435b;font:inherit;line-height:1.55;outline:none}.composer textarea:focus{border-color:#a77fd1;box-shadow:0 0 0 3px rgba(167,127,209,.12)}.choices{flex-wrap:wrap;gap:17px;margin:14px 0 20px;color:#696c80;font-size:.76rem}.choices label{display:flex;align-items:center;gap:7px}.primary{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border:0;border-radius:999px;background:linear-gradient(135deg,#7768c5,#bd66b1);color:#fff;font-weight:900;text-decoration:none;cursor:pointer}.primary:disabled{opacity:.55;cursor:default}.economy-note{margin:16px 0 0;color:#8a8c9c;font-size:.7rem;line-height:1.55}.result-card{min-width:0;padding:clamp(20px,4vw,32px);display:flex;flex-direction:column;justify-content:center;min-height:390px;overflow:hidden}.result-card.has-image{justify-content:flex-start}.generated-image{width:calc(100% + clamp(40px,8vw,64px));max-height:520px;margin:calc(-1 * clamp(20px,4vw,32px)) calc(-1 * clamp(20px,4vw,32px)) 22px;object-fit:contain;background:#eeebf4}.status-row{gap:9px;color:#6c6680;font-size:.75rem}.status-row small{margin-left:auto;color:#a0a0ad}.status-dot{width:10px;height:10px;border-radius:50%;background:#a7a7b4}.status-dot.done{background:#64b886}.status-dot.failed,.status-dot.cancelled{background:#d77d83}.status-dot.running{background:#78aee5}.status-dot.pending{background:#c8a75e}.result-card h2{margin:20px 0 8px;font-size:clamp(1.5rem,4vw,2.2rem)}.result-card p{color:#787b8e;line-height:1.6}.empty-art{width:84px;height:84px;display:grid;place-items:center;border-radius:24px;background:linear-gradient(145deg,#e4f4ff,#f4e2ff);color:#7658ac;font-size:2rem}.page-error,.error{color:#ae4f61}.page-error{max-width:1120px;margin:18px auto 0;padding:12px 15px;border-radius:14px;background:#fff0f2}.signin-card{padding:clamp(24px,6vw,58px)}.signin-card .primary{margin-top:8px}@media(max-width:760px){.generate-shell{padding:14px}.brand span{display:none}.topbar nav{gap:10px}.topbar nav a{font-size:.68rem}.hero{align-items:stretch;flex-direction:column}.quota-card{width:100%}.studio{grid-template-columns:1fr}.result-card{min-height:270px}.choices{align-items:flex-start;flex-direction:column}.hero h1,.signin-card h1{font-size:clamp(3rem,20vw,5rem)}}
</style>
