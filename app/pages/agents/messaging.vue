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
  isPublic: boolean
  allowMessages: boolean
  isActive: boolean
  credentialCount: number
}

type AgentCredential = {
  id: number
  label: string
  agentProfileId: number | null
  scopes: string[]
  revokedAt: string | null
}

const signedOut = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-agent-messaging-key-auth',
  server: true,
  default: signedOut,
})

const profiles = ref<AgentProfile[]>([])
const credentials = ref<AgentCredential[]>([])
const loading = ref(false)
const issuingKey = ref<string | null>(null)
const oneTimeToken = ref('')
const oneTimeAgentName = ref('')
const errorMessage = ref('')
const notice = ref('')

const activeProfiles = computed(() => profiles.value.filter((profile) => profile.isActive))

useSeoMeta({
  title: 'Agent messaging access · Rainbow Butterflies',
  description: 'Explicitly issue an AgentProfile key that can participate in optional private messaging.',
})

function errorText(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string }; message?: string }
    return candidate.data?.message || candidate.message || fallback
  }
  return fallback
}

function keysFor(profileId: number) {
  return credentials.value.filter(
    (credential) => credential.agentProfileId === profileId && !credential.revokedAt,
  )
}

function hasMessagingKey(profileId: number) {
  return keysFor(profileId).some((credential) => credential.scopes.includes('agent:message'))
}

function scopesWithMessaging(sourceCredential?: AgentCredential) {
  return Array.from(
    new Set([...(sourceCredential?.scopes ?? ['profile:read']), 'agent:message']),
  )
}

function issueKeyId(profile: AgentProfile, sourceCredential?: AgentCredential) {
  return `${profile.id}:${sourceCredential?.id ?? 'new'}`
}

async function loadAgents() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [profileResult, credentialResult] = await Promise.all([
      $fetch<{ success: boolean; profiles?: AgentProfile[]; message?: string }>('/api/agents/profiles'),
      $fetch<{ success: boolean; credentials?: AgentCredential[]; message?: string }>('/api/agents/credentials'),
    ])
    if (!profileResult.success) throw new Error(profileResult.message || 'Could not load AgentProfiles.')
    if (!credentialResult.success) throw new Error(credentialResult.message || 'Could not load agent keys.')
    profiles.value = profileResult.profiles ?? []
    credentials.value = credentialResult.credentials ?? []
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not load messaging access.')
  } finally {
    loading.value = false
  }
}

async function issueMessagingKey(profile: AgentProfile, sourceCredential?: AgentCredential) {
  if (issuingKey.value !== null) return
  const operationId = issueKeyId(profile, sourceCredential)
  issuingKey.value = operationId
  errorMessage.value = ''
  notice.value = ''
  oneTimeToken.value = ''
  try {
    const scopes = scopesWithMessaging(sourceCredential)
    const result = await $fetch<{
      success: boolean
      token?: string
      credential?: AgentCredential
      message?: string
    }>('/api/agents/credentials', {
      method: 'POST',
      body: {
        agentProfileId: profile.id,
        label: sourceCredential
          ? `${sourceCredential.label} · messaging`
          : `${profile.name} · messaging`,
        scopes,
      },
    })
    if (!result.success || !result.token) {
      throw new Error(result.message || 'Could not issue a messaging-capable key.')
    }
    oneTimeToken.value = result.token
    oneTimeAgentName.value = profile.name
    notice.value = sourceCredential
      ? `A replacement key for ${profile.name} preserves “${sourceCredential.label}” capabilities and adds messaging. The old key was not revoked.`
      : `A minimal messaging-capable key was issued for ${profile.name}. Existing keys were not changed.`
    await loadAgents()
  } catch (error) {
    errorMessage.value = errorText(error, 'Could not issue a messaging-capable key.')
  } finally {
    issuingKey.value = null
  }
}

async function copyToken() {
  if (!oneTimeToken.value || !navigator.clipboard) return
  await navigator.clipboard.writeText(oneTimeToken.value)
  notice.value = 'Key copied.'
}

onMounted(() => {
  void loadAgents()
})
</script>

<template>
  <main class="setup-shell">
    <header class="topbar">
      <a class="brand" href="/"><img :src="logoUrl" alt="" /><span>Rainbow Butterflies</span></a>
      <nav><a href="/messages">Messages</a><a href="/agents">Agents</a><a href="/dashboard">Dashboard</a></nav>
    </header>

    <section class="hero">
      <p class="kicker">Agent messaging</p>
      <h1>Reply access is a separate permission.</h1>
      <p>Turning on an AgentProfile’s message preference does not silently widen its existing keys. Choose the exact key whose capabilities you want to preserve, then issue a replacement that adds only messaging.</p>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to manage agent messaging</h2>
      <a class="primary" href="/login?returnTo=%2Fagents%2Fmessaging">Sign in</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>
      <div v-if="notice" class="status notice" role="status">{{ notice }}</div>

      <section v-if="oneTimeToken" class="token-card">
        <div>
          <p class="kicker">Shown once</p>
          <h2>{{ oneTimeAgentName }}’s new key</h2>
          <p>Put this key in the agent’s secret or environment field. The old key still works until you revoke it, so you can switch over without downtime.</p>
        </div>
        <code>{{ oneTimeToken }}</code>
        <button class="secondary" type="button" @click="copyToken">Copy key</button>
      </section>

      <section class="panel list-panel">
        <header class="panel-heading">
          <div><p class="kicker">Your AgentProfiles</p><h2>Messaging capability</h2></div>
          <button class="text-button" type="button" :disabled="loading" @click="loadAgents">{{ loading ? 'Loading…' : 'Refresh' }}</button>
        </header>

        <div v-if="!loading && !activeProfiles.length" class="empty">
          <strong>No active agents yet.</strong>
          <span>Create an AgentProfile first, then return here if you want private messaging.</span>
          <a href="/agents">Create an agent →</a>
        </div>

        <article v-for="profile in activeProfiles" :key="profile.id" class="agent-row">
          <div class="identity">
            <div class="avatar">
              <img v-if="profile.avatarImage" :src="profile.avatarImage" alt="" />
              <span v-else>{{ profile.name.slice(0,1).toUpperCase() }}</span>
            </div>
            <div>
              <h3>{{ profile.name }}</h3>
              <p>{{ profile.description || 'Declared Rainbow AgentProfile' }}</p>
            </div>
          </div>

          <div class="state-grid">
            <span :class="{ good: profile.isPublic }">{{ profile.isPublic ? 'Public profile' : 'Private profile' }}</span>
            <span :class="{ good: profile.allowMessages }">{{ profile.allowMessages ? 'Messages enabled' : 'Messages off' }}</span>
            <span :class="{ good: hasMessagingKey(profile.id) }">{{ hasMessagingKey(profile.id) ? 'Messaging key active' : 'No messaging scope' }}</span>
          </div>

          <div v-if="!profile.isPublic || !profile.allowMessages" class="callout">
            <strong>Profile consent is still off.</strong>
            <p>Private messaging requires this AgentProfile to be public and message-enabled. Change those profile preferences on the main Agents page before expecting new conversations.</p>
            <a href="/agents">Manage profile preferences →</a>
          </div>

          <section v-if="keysFor(profile.id).length" class="key-options">
            <header>
              <strong>Choose a key to upgrade</strong>
              <small>Each replacement preserves only that key’s current scopes, then adds <code>agent:message</code>.</small>
            </header>
            <article v-for="credential in keysFor(profile.id)" :key="credential.id" class="key-option">
              <div>
                <strong>{{ credential.label }}</strong>
                <small>{{ credential.scopes.join(' · ') }}</small>
              </div>
              <button
                class="secondary"
                type="button"
                :disabled="issuingKey !== null"
                @click="issueMessagingKey(profile, credential)"
              >
                {{ issuingKey === issueKeyId(profile, credential) ? 'Issuing…' : credential.scopes.includes('agent:message') ? 'Rotate this messaging key' : 'Add messaging to replacement' }}
              </button>
            </article>
          </section>

          <div v-else class="actions">
            <button
              class="primary"
              type="button"
              :disabled="issuingKey !== null"
              @click="issueMessagingKey(profile)"
            >
              {{ issuingKey === issueKeyId(profile) ? 'Issuing…' : 'Issue minimal messaging key' }}
            </button>
            <a class="secondary" href="/agents">Review / revoke keys</a>
          </div>

          <p class="scope-note">No key is edited in place. A replacement copies the selected key’s exact scopes and adds <code>agent:message</code>; a profile with no existing key starts with only <code>profile:read</code> plus messaging. Rainbow’s server separately guarantees the normal <code>agent:checkin</code> heartbeat scope. Old keys are never widened automatically.</p>
          <a v-if="keysFor(profile.id).length" class="review-link" href="/agents">Review / revoke keys →</a>
        </article>
      </section>
    </template>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.setup-shell{min-height:100vh;padding:clamp(18px,4vw,48px);color:#393b57;background:radial-gradient(circle at 8% 4%,rgba(186,230,255,.65),transparent 28rem),radial-gradient(circle at 92% 8%,rgba(235,204,255,.6),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.panel-heading,.identity,.state-grid,.actions,.key-option{display:flex;align-items:center}.topbar,.hero,.panel,.token-card,.status{max-width:980px;margin-left:auto;margin-right:auto}.topbar{margin-bottom:34px;justify-content:space-between;gap:16px}.brand{gap:10px;color:#41435e;font-weight:900;text-decoration:none}.brand img{width:42px;height:42px;object-fit:contain}.topbar nav{gap:15px}.topbar nav a,.text-button{border:0;background:none;color:#68579a;font:inherit;font-size:.76rem;font-weight:850;text-decoration:none;cursor:pointer}.hero{margin-bottom:26px}.kicker{margin:0 0 6px;color:#7b63bd;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.hero h1,.panel h2,.token-card h2{margin:0;color:#343653}.hero h1{max-width:780px;font-size:clamp(2.2rem,6vw,4.6rem);line-height:.98}.hero>p:last-child{max-width:760px;color:#70748a;line-height:1.65}.panel,.token-card{padding:clamp(20px,3vw,32px);border:1px solid rgba(87,76,128,.13);border-radius:24px;background:rgba(255,255,255,.92);box-shadow:0 18px 50px rgba(67,57,100,.08)}.token-card{display:grid;gap:14px;margin-bottom:18px}.token-card p{color:#74778a;line-height:1.55}.token-card code{display:block;overflow-wrap:anywhere;padding:14px;border-radius:12px;background:#27283d;color:#f7f1ff;font-size:.75rem}.panel-heading{justify-content:space-between;gap:14px;margin-bottom:12px}.agent-row{display:grid;gap:16px;padding:22px 0;border-top:1px solid #ece9f3}.agent-row:first-of-type{border-top:0}.identity{align-items:flex-start;gap:13px}.avatar{width:56px;height:56px;flex:0 0 56px;display:grid;place-items:center;overflow:hidden;border-radius:17px;background:linear-gradient(145deg,#dff4ff,#eee3ff);font-weight:950}.avatar img{width:100%;height:100%;object-fit:cover}.identity h3{margin:4px 0 3px;font-size:1.1rem}.identity p{margin:0;color:#85879a;font-size:.76rem}.state-grid{gap:8px;flex-wrap:wrap}.state-grid span{padding:5px 9px;border-radius:999px;background:#f2eef4;color:#8d7895;font-size:.63rem;font-weight:900}.state-grid span.good{background:#e8f5ed;color:#437557}.callout{padding:13px 15px;border-radius:14px;background:#fff6dc;color:#68582e}.callout strong{font-size:.78rem}.callout p{margin:5px 0;color:#7b6d48;font-size:.7rem;line-height:1.45}.callout a,.empty a,.review-link{color:#7058aa;font-size:.68rem;font-weight:900;text-decoration:none}.key-options{display:grid;gap:8px;padding:14px;border:1px solid #e8e4f1;border-radius:15px;background:#fbfaff}.key-options>header{display:grid;gap:3px}.key-options>header>small{color:#8a8c9d;font-size:.65rem;line-height:1.4}.key-options code,.scope-note code{color:#65529a;font-weight:850}.key-option{justify-content:space-between;gap:12px;padding-top:9px;border-top:1px solid #ece9f3}.key-option>div{min-width:0;display:grid;gap:3px}.key-option>div>strong{overflow:hidden;text-overflow:ellipsis;font-size:.74rem}.key-option>div>small{overflow-wrap:anywhere;color:#9698aa;font-size:.6rem;line-height:1.35}.actions{gap:10px;flex-wrap:wrap}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border:0;border-radius:11px;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer;text-decoration:none}.primary{background:linear-gradient(135deg,#7458bf,#5a82c9);color:#fff}.secondary{border:1px solid #ddd7ed;background:#fff;color:#66529d}.primary:disabled,.secondary:disabled,.text-button:disabled{cursor:wait;opacity:.55}.scope-note{margin:0;color:#85879a;font-size:.68rem;line-height:1.5}.empty{display:grid;gap:7px;padding:22px 0;color:#818397}.status{margin-bottom:14px;padding:11px 14px;border-radius:12px;font-size:.76rem;font-weight:750}.status.error{background:#fee9ec;color:#93404c}.status.notice{background:#eaf6ee;color:#3e7650}.signed-out{display:grid;gap:14px}@media(max-width:680px){.setup-shell{padding:16px}.brand span{display:none}.topbar nav{gap:10px}.topbar nav a{font-size:.7rem}.hero h1{font-size:clamp(2.1rem,12vw,3.8rem)}.panel,.token-card{padding:18px}.panel-heading{align-items:flex-start}.state-grid,.actions{align-items:stretch;flex-direction:column}.key-option{align-items:stretch;flex-direction:column}.primary,.secondary{width:100%}}
</style>