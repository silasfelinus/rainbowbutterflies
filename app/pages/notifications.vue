<script setup lang="ts">
import { computed, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type Preference = {
  userId: number
  agentAttention: boolean
  forumReplyMention: boolean
  scheduledAgentFailure: boolean
  updatedAt: string | null
}

type PreferenceResponse = {
  success: boolean
  preference?: Preference
  message?: string
}

const signedOut = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const emptyPreference = (): Preference => ({
  userId: 0,
  agentAttention: false,
  forumReplyMention: false,
  scheduledAgentFailure: false,
  updatedAt: null,
})

const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-notification-auth',
  server: true,
  default: signedOut,
})

const preference = ref<Preference>(emptyPreference())
const savedPreference = ref<Preference>(emptyPreference())
const loading = ref(false)
const saving = ref(false)
const message = ref('')
const errorMessage = ref('')

const dirty = computed(
  () =>
    preference.value.agentAttention !== savedPreference.value.agentAttention ||
    preference.value.forumReplyMention !== savedPreference.value.forumReplyMention ||
    preference.value.scheduledAgentFailure !== savedPreference.value.scheduledAgentFailure,
)

const enabledCount = computed(
  () =>
    Number(preference.value.agentAttention) +
    Number(preference.value.forumReplyMention) +
    Number(preference.value.scheduledAgentFailure),
)

useSeoMeta({
  title: 'Notification settings',
  description: 'Choose which Rainbow Butterflies events may reach you outside the website.',
})

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const value = error as { data?: { message?: string }; message?: string }
    return value.data?.message || value.message || fallback
  }
  return fallback
}

function applyPreference(next: Preference) {
  preference.value = { ...next }
  savedPreference.value = { ...next }
}

async function loadPreference() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<PreferenceResponse>('/api/notifications/preferences')
    if (!result.success || !result.preference) {
      throw new Error(result.message || 'Could not load notification settings.')
    }
    applyPreference(result.preference)
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load notification settings.')
  } finally {
    loading.value = false
  }
}

async function savePreference() {
  if (!authState.value.authenticated || saving.value) return
  saving.value = true
  message.value = ''
  errorMessage.value = ''
  try {
    const result = await $fetch<PreferenceResponse>('/api/notifications/preferences', {
      method: 'PATCH',
      body: {
        agentAttention: preference.value.agentAttention,
        forumReplyMention: preference.value.forumReplyMention,
        scheduledAgentFailure: preference.value.scheduledAgentFailure,
      },
    })
    if (!result.success || !result.preference) {
      throw new Error(result.message || 'Could not save notification settings.')
    }
    applyPreference(result.preference)
    message.value = 'Notification preferences saved.'
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not save notification settings.')
  } finally {
    saving.value = false
  }
}

if (authState.value.authenticated) await loadPreference()
</script>

<template>
  <main class="notification-shell">
    <header class="topbar">
      <a class="brand" href="/"><img :src="logoUrl" alt="" /><span>Rainbow Butterflies</span></a>
      <nav><a href="/dashboard">Dashboard</a><a href="/agents">Agents</a><a href="/#commons">Commons</a></nav>
    </header>

    <section class="hero">
      <div>
        <p class="kicker">Notification settings</p>
        <h1>Choose what is worth interrupting you for.</h1>
        <p>Everything starts off. Opt into only the Rainbow events you actually want delivered beyond the website.</p>
      </div>
      <aside class="summary-card">
        <strong>{{ enabledCount }}</strong>
        <span>of 3 classes enabled</span>
        <small>No existing account is subscribed automatically.</small>
      </aside>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to manage notifications</h2>
      <p>These preferences belong to your shared Kind Robots identity.</p>
      <a class="primary" href="/login?returnTo=%2Fnotifications">Sign in or create an account</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>
      <div v-if="message" class="status success" role="status">{{ message }}</div>

      <section class="panel">
        <header class="panel-heading">
          <div>
            <p class="kicker">Opt-in classes</p>
            <h2>Small on purpose.</h2>
          </div>
          <span v-if="loading" class="loading">Loading…</span>
        </header>

        <label class="preference-row">
          <span class="preference-copy">
            <strong>Agent asks for your attention</strong>
            <small>Help, approval, decision, or review requests from one of your connected agents.</small>
          </span>
          <input v-model="preference.agentAttention" type="checkbox" :disabled="loading || saving" />
        </label>

        <label class="preference-row">
          <span class="preference-copy">
            <strong>Direct forum replies or mentions</strong>
            <small>Conversation aimed at you, not general forum activity or popularity signals.</small>
          </span>
          <input v-model="preference.forumReplyMention" type="checkbox" :disabled="loading || saving" />
        </label>

        <label class="preference-row">
          <span class="preference-copy">
            <strong>Scheduled agent failure</strong>
            <small>A recurring agent you depend on failed and may need intervention. Routine successful runs stay quiet.</small>
          </span>
          <input v-model="preference.scheduledAgentFailure" type="checkbox" :disabled="loading || saving" />
        </label>

        <div class="save-row">
          <p>
            These settings are stored canonically in Kind Robots. The delivery seam is provider-neutral and verifies the account email before making it eligible. External email delivery is not active in this task and no Brevo message is sent by changing these toggles.
          </p>
          <button class="primary" type="button" :disabled="saving || loading || !dirty" @click="savePreference">
            {{ saving ? 'Saving…' : dirty ? 'Save preferences' : 'Saved' }}
          </button>
        </div>
      </section>

      <section class="boundary-card">
        <span aria-hidden="true">✦</span>
        <div>
          <strong>Website state is the authority.</strong>
          <p>A future email provider can deliver only what these preferences allow. Provider contact lists must not become a second subscription truth.</p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.notification-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 9% 4%,rgba(186,230,255,.65),transparent 30rem),radial-gradient(circle at 92% 7%,rgba(235,204,255,.58),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.hero,.panel-heading,.preference-row,.save-row,.boundary-card{display:flex;align-items:center}.topbar,.hero,.panel,.status,.boundary-card{max-width:1040px;margin-left:auto;margin-right:auto}.topbar{justify-content:space-between;gap:16px;margin-bottom:40px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a{color:#68579a;font-size:.76rem;font-weight:800;text-decoration:none}.hero{align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:22px}.hero>div{max-width:720px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h2{margin:0;color:#343653}.hero h1{font-size:clamp(2.4rem,7vw,4.8rem);line-height:.95;letter-spacing:-.05em}.hero>div>p:last-child{margin:13px 0 0;color:#70748a;line-height:1.6}.summary-card{min-width:190px;padding:18px;border:1px solid rgba(87,76,128,.13);border-radius:20px;background:rgba(255,255,255,.9);box-shadow:0 12px 35px rgba(67,57,100,.06)}.summary-card strong,.summary-card span,.summary-card small{display:block}.summary-card strong{font-size:2rem;color:#5d4f8b}.summary-card span{font-size:.68rem;font-weight:900;color:#6f7185}.summary-card small{margin-top:6px;color:#999aab;font-size:.58rem;line-height:1.45}.panel{padding:clamp(20px,3vw,30px);border:1px solid rgba(87,76,128,.13);border-radius:24px;background:rgba(255,255,255,.92);box-shadow:0 18px 50px rgba(67,57,100,.08)}.panel-heading{justify-content:space-between;gap:15px;margin-bottom:10px}.loading{font-size:.68rem;color:#9395a6}.preference-row{justify-content:space-between;gap:24px;padding:20px 4px;border-top:1px solid #ece8f3;cursor:pointer}.preference-copy{display:grid;gap:5px}.preference-copy strong{color:#45475f}.preference-copy small{max-width:720px;color:#7d8093;font-size:.72rem;line-height:1.55}.preference-row input{width:24px;height:24px;flex:0 0 auto;accent-color:#765fbd}.save-row{align-items:flex-end;justify-content:space-between;gap:28px;padding-top:19px;border-top:1px solid #ece8f3}.save-row p{max-width:720px;margin:0;color:#8b8d9e;font-size:.68rem;line-height:1.55}.primary{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;padding:10px 15px;border:0;border-radius:999px;background:linear-gradient(135deg,#7458bf,#aa65b3);color:#fff;font-weight:900;text-decoration:none;cursor:pointer}.primary:disabled{opacity:.55;cursor:default}.signed-out{display:grid;justify-items:start;gap:12px}.signed-out p{margin:0;color:#74778d}.status{margin-bottom:14px;padding:11px 14px;border-radius:12px;font-size:.74rem}.status.error{border:1px solid #efd2d2;background:#fff5f4;color:#8b4e55}.status.success{border:1px solid #cfe7d3;background:#f4fbf5;color:#4f7859}.boundary-card{gap:13px;margin-top:14px;padding:17px 20px;border:1px solid #dfd8eb;border-radius:18px;background:rgba(248,246,252,.9)}.boundary-card>span{display:grid;place-items:center;width:34px;height:34px;flex:0 0 auto;border-radius:11px;background:#eee9f7;color:#725ca6}.boundary-card strong{color:#55516d}.boundary-card p{margin:4px 0 0;color:#858798;font-size:.68rem;line-height:1.5}@media(max-width:720px){.notification-shell{padding:16px}.topbar{align-items:flex-start}.brand span{display:none}.topbar nav{gap:10px;flex-wrap:wrap;justify-content:flex-end}.hero{align-items:flex-start;flex-direction:column}.summary-card{width:100%}.preference-row{align-items:flex-start}.save-row{align-items:flex-start;flex-direction:column}.save-row .primary{width:100%}}
</style>
