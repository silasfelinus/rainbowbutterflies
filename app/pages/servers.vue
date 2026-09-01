<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

type AuthState =
  | { authenticated: true; user: { id: number; username: string }; expiresAt: string }
  | { authenticated: false; user: null; expiresAt: null }

type GeneratorServer = {
  id: number
  title: string
  description: string | null
  serverType: 'A1111' | 'COMFY' | 'CUSTOM'
  baseUrl: string | null
  endpointPath: string | null
  healthPath: string | null
  userId: number | null
  isPublic: boolean
  isOfficial: boolean
  isDefault: boolean
  isActive: boolean
  isEditable: boolean
  hasApiKey: boolean
  model: string | null
  version: string | null
  lastCheckedAt: string | null
  lastStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN'
  accessMode: 'BROWSER' | 'BACKEND' | 'TAILSCALE' | 'PUBLIC' | 'LOCAL'
  authType: 'NONE' | 'BEARER' | 'HEADER' | 'API_KEY'
  apiKeyName: string | null
  isMature: boolean
  ownedByYou: boolean
}

type EditableServer = GeneratorServer & {
  replacementKey?: string
}

const signedOutState = (): AuthState => ({ authenticated: false, user: null, expiresAt: null })
const { data: authState } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-servers-auth',
  server: true,
  default: signedOutState,
})

const servers = ref<EditableServer[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const notice = ref('')

const title = ref('')
const description = ref('')
const serverType = ref<'A1111' | 'COMFY' | 'CUSTOM'>('COMFY')
const baseUrl = ref('')
const endpointPath = ref('')
const healthPath = ref('')
const accessMode = ref<'BROWSER' | 'BACKEND' | 'TAILSCALE' | 'PUBLIC' | 'LOCAL'>('BACKEND')
const authType = ref<'NONE' | 'BEARER' | 'HEADER' | 'API_KEY'>('NONE')
const apiKeyName = ref('')
const apiKey = ref('')
const model = ref('')
const isMature = ref(false)
const isPublic = ref(false)

const ownedServers = computed(() => servers.value.filter((server) => server.ownedByYou))
const sharedServers = computed(() => servers.value.filter((server) => !server.ownedByYou))

useSeoMeta({
  title: 'Generator servers',
  description: 'Connect and manage your own image-generation servers for Rainbow Butterflies.',
})

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string }; message?: string }
    if (candidate.data?.message) return candidate.data.message
    if (candidate.message) return candidate.message
  }
  return fallback
}

function resetCreateForm() {
  title.value = ''
  description.value = ''
  serverType.value = 'COMFY'
  baseUrl.value = ''
  endpointPath.value = ''
  healthPath.value = ''
  accessMode.value = 'BACKEND'
  authType.value = 'NONE'
  apiKeyName.value = ''
  apiKey.value = ''
  model.value = ''
  isMature.value = false
  isPublic.value = false
}

async function loadServers() {
  if (!authState.value.authenticated || loading.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ success: boolean; servers?: GeneratorServer[]; message?: string }>(
      '/api/servers',
    )
    if (!result.success) throw new Error(result.message || 'Could not load generator servers.')
    servers.value = (result.servers ?? []).map((server) => ({ ...server, replacementKey: '' }))
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not load generator servers.')
  } finally {
    loading.value = false
  }
}

async function createServer() {
  if (!authState.value.authenticated || saving.value || !title.value.trim() || !baseUrl.value.trim()) return
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const result = await $fetch<{ success: boolean; server?: GeneratorServer | null; message?: string }>(
      '/api/servers',
      {
        method: 'POST',
        body: {
          title: title.value.trim(),
          description: description.value.trim() || null,
          serverType: serverType.value,
          baseUrl: baseUrl.value.trim(),
          endpointPath: endpointPath.value.trim() || null,
          healthPath: healthPath.value.trim() || null,
          accessMode: accessMode.value,
          authType: authType.value,
          apiKeyName: apiKeyName.value.trim() || null,
          apiKey: apiKey.value || null,
          model: model.value.trim() || null,
          isMature: isMature.value,
          isPublic: isPublic.value,
        },
      },
    )
    if (!result.success) throw new Error(result.message || 'Could not save generator server.')
    notice.value = `${title.value.trim()} is connected.`
    resetCreateForm()
    await loadServers()
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not save generator server.')
  } finally {
    saving.value = false
  }
}

async function saveServer(server: EditableServer) {
  if (saving.value) return
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const body: Record<string, unknown> = {
      title: server.title,
      description: server.description,
      serverType: server.serverType,
      baseUrl: server.baseUrl,
      endpointPath: server.endpointPath,
      healthPath: server.healthPath,
      accessMode: server.accessMode,
      authType: server.authType,
      apiKeyName: server.apiKeyName,
      model: server.model,
      isMature: server.isMature,
      isPublic: server.isPublic,
      isActive: server.isActive,
    }
    if (server.replacementKey) body.apiKey = server.replacementKey

    const result = await $fetch<{ success: boolean; message?: string }>(`/api/servers/${server.id}`, {
      method: 'PATCH',
      body,
    })
    if (!result.success) throw new Error(result.message || 'Could not update generator server.')
    server.replacementKey = ''
    notice.value = `${server.title} updated.`
    await loadServers()
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not update generator server.')
  } finally {
    saving.value = false
  }
}

async function removeServer(server: EditableServer) {
  if (!confirm(`Remove ${server.title}? This removes the server connection from your account.`)) return
  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    const result = await $fetch<{ success: boolean; message?: string }>(`/api/servers/${server.id}`, {
      method: 'DELETE',
    })
    if (!result.success) throw new Error(result.message || 'Could not remove generator server.')
    notice.value = `${server.title} removed.`
    await loadServers()
  } catch (error) {
    errorMessage.value = messageFrom(error, 'Could not remove generator server.')
  } finally {
    saving.value = false
  }
}

function statusLabel(server: GeneratorServer) {
  if (!server.isActive) return 'Paused'
  if (server.lastStatus === 'ONLINE') return 'Online'
  if (server.lastStatus === 'OFFLINE') return 'Offline'
  if (server.lastStatus === 'DEGRADED') return 'Degraded'
  return 'Not checked'
}

function checkedLabel(value: string | null) {
  if (!value) return 'No health check recorded yet'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Health check time unavailable' : `Checked ${date.toLocaleString()}`
}

onMounted(() => {
  void loadServers()
})
</script>

<template>
  <main class="servers-shell">
    <header class="servers-topbar">
      <a href="/" class="servers-brand">
        <img :src="logoUrl" alt="" />
        <span>Rainbow Butterflies</span>
      </a>
      <nav aria-label="Dashboard">
        <a href="/agents">Agents</a>
        <a href="/" class="back-link">Home</a>
      </nav>
    </header>

    <section class="servers-hero">
      <p class="section-kicker">Generator servers</p>
      <h1>Bring your own pixels.</h1>
      <p>
        Connect ComfyUI, A1111, or another compatible generator. Work run on a server you own has
        <strong>no Rainbow or Kind Robots generation-token charge</strong>.
      </p>
      <small>Hardware, electricity, and any third-party provider fees are still yours.</small>
    </section>

    <section v-if="!authState.authenticated" class="panel signed-out">
      <h2>Sign in to connect a server</h2>
      <p>Your generator connections belong to the same account as your agents and creations.</p>
      <a class="primary-button" href="/login?returnTo=%2Fservers">Sign in or create an account</a>
    </section>

    <template v-else>
      <div v-if="errorMessage" class="status error" role="alert">{{ errorMessage }}</div>
      <div v-if="notice" class="status notice" role="status">{{ notice }}</div>

      <section class="ownership-note">
        <strong>Private by default.</strong>
        <span>
          Turning on public sharing donates this server's available generation capacity to other
          community users. Public, non-official servers are currently free for them to use too.
        </span>
      </section>

      <div class="servers-grid">
        <section class="panel create-panel">
          <p class="section-kicker">Your compute</p>
          <h2>Connect a generator</h2>
          <form class="server-form" @submit.prevent="createServer">
            <label>
              <span>Name</span>
              <input v-model="title" maxlength="160" required placeholder="Studio Comfy" />
            </label>

            <div class="field-pair">
              <label>
                <span>Type</span>
                <select v-model="serverType">
                  <option value="COMFY">ComfyUI</option>
                  <option value="A1111">A1111 / Forge</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              <label>
                <span>Connection</span>
                <select v-model="accessMode">
                  <option value="BACKEND">Reachable by Rainbow server</option>
                  <option value="PUBLIC">Public internet</option>
                  <option value="TAILSCALE">Tailscale</option>
                  <option value="LOCAL">Local network</option>
                  <option value="BROWSER">Browser relay</option>
                </select>
              </label>
            </div>

            <label>
              <span>Server URL</span>
              <input v-model="baseUrl" type="url" required placeholder="http://192.168.1.20:8188" />
            </label>

            <div class="field-pair">
              <label>
                <span>Generation path <small>optional</small></span>
                <input v-model="endpointPath" placeholder="/prompt" />
              </label>
              <label>
                <span>Health path <small>optional</small></span>
                <input v-model="healthPath" placeholder="/system_stats" />
              </label>
            </div>

            <label>
              <span>Model / preset <small>optional</small></span>
              <input v-model="model" placeholder="Flux, Krea2, SDXL…" />
            </label>

            <label>
              <span>Description <small>optional</small></span>
              <textarea v-model="description" rows="2" maxlength="5000" placeholder="What this server is good at." />
            </label>

            <fieldset>
              <legend>Authentication</legend>
              <label>
                <span>Method</span>
                <select v-model="authType">
                  <option value="NONE">None</option>
                  <option value="BEARER">Bearer token</option>
                  <option value="API_KEY">API key header</option>
                  <option value="HEADER">Custom header</option>
                </select>
              </label>
              <template v-if="authType !== 'NONE'">
                <label v-if="authType === 'API_KEY' || authType === 'HEADER'">
                  <span>Header name</span>
                  <input v-model="apiKeyName" placeholder="X-API-Key" />
                </label>
                <label>
                  <span>Secret key</span>
                  <input v-model="apiKey" type="password" autocomplete="new-password" />
                  <small>Write-only. Rainbow will not show the stored value again.</small>
                </label>
              </template>
            </fieldset>

            <div class="toggle-list">
              <label class="toggle-row">
                <input v-model="isMature" type="checkbox" />
                <span><strong>Mature-capable</strong><small>Use shared maturity rules for eligible jobs.</small></span>
              </label>
              <label class="toggle-row public-toggle">
                <input v-model="isPublic" type="checkbox" />
                <span><strong>Donate spare capacity</strong><small>Allow other users to generate on this server for free.</small></span>
              </label>
            </div>

            <div v-if="isPublic" class="share-warning" role="note">
              You are opting this server into community compute. Keep it private if you do not want
              other Rainbow users sending generation jobs to it.
            </div>

            <button class="primary-button" type="submit" :disabled="saving || !title.trim() || !baseUrl.trim()">
              {{ saving ? 'Connecting…' : 'Connect server' }}
            </button>
          </form>
        </section>

        <section class="panel list-panel">
          <div class="panel-heading">
            <div>
              <p class="section-kicker">Connected</p>
              <h2>Your servers</h2>
            </div>
            <button class="text-button" type="button" :disabled="loading" @click="loadServers">
              {{ loading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>

          <div v-if="!loading && ownedServers.length === 0" class="empty-state">
            <strong>No personal servers connected.</strong>
            <span>Add one here and generations routed to your own compute cost zero platform tokens.</span>
          </div>

          <article v-for="server in ownedServers" :key="server.id" class="server-card">
            <div class="server-card-head">
              <div>
                <div class="server-title-line">
                  <h3>{{ server.title }}</h3>
                  <span class="status-chip" :data-status="server.lastStatus">{{ statusLabel(server) }}</span>
                </div>
                <p>{{ server.serverType }}<span v-if="server.model"> · {{ server.model }}</span></p>
                <small>{{ checkedLabel(server.lastCheckedAt) }}</small>
              </div>
              <span v-if="server.hasApiKey" class="key-saved">Key saved</span>
            </div>

            <div class="server-summary">
              <code>{{ server.baseUrl }}</code>
              <span>{{ server.isPublic ? 'Community shared' : 'Private' }}</span>
            </div>

            <details class="server-settings">
              <summary>Settings</summary>
              <div class="settings-body">
                <label>
                  <span>Name</span>
                  <input v-model="server.title" maxlength="160" />
                </label>
                <label>
                  <span>Server URL</span>
                  <input v-model="server.baseUrl" type="url" />
                </label>
                <div class="field-pair">
                  <label>
                    <span>Type</span>
                    <select v-model="server.serverType">
                      <option value="COMFY">ComfyUI</option>
                      <option value="A1111">A1111 / Forge</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </label>
                  <label>
                    <span>Connection</span>
                    <select v-model="server.accessMode">
                      <option value="BACKEND">Rainbow server</option>
                      <option value="PUBLIC">Public internet</option>
                      <option value="TAILSCALE">Tailscale</option>
                      <option value="LOCAL">Local network</option>
                      <option value="BROWSER">Browser relay</option>
                    </select>
                  </label>
                </div>
                <div class="field-pair">
                  <label>
                    <span>Generation path</span>
                    <input v-model="server.endpointPath" />
                  </label>
                  <label>
                    <span>Health path</span>
                    <input v-model="server.healthPath" />
                  </label>
                </div>
                <label>
                  <span>Model / preset</span>
                  <input v-model="server.model" />
                </label>
                <label>
                  <span>Description</span>
                  <textarea v-model="server.description" rows="2" maxlength="5000" />
                </label>
                <div class="field-pair">
                  <label>
                    <span>Authentication</span>
                    <select v-model="server.authType">
                      <option value="NONE">None</option>
                      <option value="BEARER">Bearer token</option>
                      <option value="API_KEY">API key header</option>
                      <option value="HEADER">Custom header</option>
                    </select>
                  </label>
                  <label v-if="server.authType === 'API_KEY' || server.authType === 'HEADER'">
                    <span>Header name</span>
                    <input v-model="server.apiKeyName" />
                  </label>
                </div>
                <label v-if="server.authType !== 'NONE'">
                  <span>Replace secret key <small>leave blank to keep current</small></span>
                  <input v-model="server.replacementKey" type="password" autocomplete="new-password" />
                </label>

                <div class="toggle-list">
                  <label class="toggle-row">
                    <input v-model="server.isActive" type="checkbox" />
                    <span><strong>Active</strong><small>Allow Rainbow to route eligible jobs here.</small></span>
                  </label>
                  <label class="toggle-row">
                    <input v-model="server.isMature" type="checkbox" />
                    <span><strong>Mature-capable</strong><small>Subject to shared maturity settings.</small></span>
                  </label>
                  <label class="toggle-row public-toggle">
                    <input v-model="server.isPublic" type="checkbox" />
                    <span><strong>Donate spare capacity</strong><small>Other users can use this compute for free.</small></span>
                  </label>
                </div>

                <div v-if="server.isPublic" class="share-warning">
                  Public, non-official servers are currently free for other users. Saving this setting
                  opts your compute into the shared pool.
                </div>

                <div class="server-actions">
                  <button class="secondary-button" type="button" :disabled="saving" @click="saveServer(server)">
                    Save settings
                  </button>
                  <button
                    v-if="!server.isPublic && !server.isDefault && !server.isOfficial"
                    class="danger-link"
                    type="button"
                    :disabled="saving"
                    @click="removeServer(server)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </details>
          </article>

          <details v-if="sharedServers.length" class="shared-list">
            <summary>{{ sharedServers.length }} community / official server{{ sharedServers.length === 1 ? '' : 's' }} available</summary>
            <div v-for="server in sharedServers" :key="server.id" class="shared-row">
              <span><strong>{{ server.title }}</strong><small>{{ server.serverType }} · {{ statusLabel(server) }}</small></span>
              <small>{{ server.isOfficial ? 'Official' : 'Community shared' }}</small>
            </div>
          </details>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.servers-shell {
  width: min(100%, 1180px);
  min-width: 0;
  margin: 0 auto;
  padding: 1rem clamp(1rem, 4vw, 2.5rem) 4rem;
  color: #463c50;
}

.servers-topbar,
.servers-topbar nav,
.servers-brand,
.server-title-line,
.server-card-head,
.panel-heading,
.server-actions {
  display: flex;
  align-items: center;
}

.servers-topbar {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: clamp(2rem, 7vw, 4.5rem);
}

.servers-topbar nav {
  gap: 1rem;
}

.servers-topbar a {
  color: #675773;
  font-weight: 850;
  text-decoration: none;
}

.servers-brand {
  gap: 0.65rem;
  min-width: 0;
}

.servers-brand img {
  width: 2.9rem;
  height: 2.9rem;
  object-fit: contain;
}

.servers-hero {
  max-width: 760px;
  margin-bottom: 2rem;
}

.servers-hero h1 {
  margin: 0.15rem 0 0.7rem;
  color: #392d45;
  font-size: clamp(2.35rem, 7vw, 4.8rem);
  line-height: 0.96;
  letter-spacing: -0.045em;
}

.servers-hero p {
  margin: 0;
  color: #6c6076;
  font-size: clamp(1rem, 2vw, 1.18rem);
  line-height: 1.6;
}

.servers-hero small {
  display: block;
  margin-top: 0.5rem;
  color: #8b8192;
}

.panel,
.ownership-note {
  border: 1px solid rgba(92, 71, 111, 0.13);
  border-radius: 1.45rem;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 55px rgba(69, 49, 85, 0.07);
}

.panel {
  min-width: 0;
  padding: clamp(1rem, 3vw, 1.65rem);
}

.ownership-note {
  display: flex;
  gap: 0.7rem;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  background: #f8f5ff;
  color: #665673;
  font-size: 0.88rem;
  line-height: 1.45;
}

.ownership-note strong {
  flex: 0 0 auto;
  color: #4b3c59;
}

.servers-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 1.25rem;
  align-items: start;
}

.panel h2 {
  margin: 0.1rem 0 1rem;
  color: #40334b;
  font-size: clamp(1.4rem, 3vw, 1.9rem);
}

.server-form,
.settings-body {
  display: grid;
  gap: 0.9rem;
}

.server-form label,
.settings-body label {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
  color: #55485f;
  font-size: 0.8rem;
  font-weight: 850;
}

.server-form input,
.server-form select,
.server-form textarea,
.settings-body input,
.settings-body select,
.settings-body textarea {
  width: 100%;
  min-width: 0;
  padding: 0.68rem 0.75rem;
  border: 1px solid rgba(85, 65, 100, 0.18);
  border-radius: 0.75rem;
  background: #fff;
  color: #392f40;
  font: inherit;
}

.server-form textarea,
.settings-body textarea {
  resize: vertical;
}

.server-form small,
.settings-body small {
  color: #918697;
  font-weight: 600;
}

.field-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

fieldset {
  display: grid;
  gap: 0.8rem;
  margin: 0;
  padding: 0.85rem;
  border: 1px solid rgba(91, 69, 106, 0.12);
  border-radius: 0.9rem;
}

legend {
  padding: 0 0.35rem;
  color: #685675;
  font-size: 0.78rem;
  font-weight: 900;
}

.toggle-list {
  display: grid;
  gap: 0.5rem;
}

.toggle-row {
  grid-template-columns: auto minmax(0, 1fr) !important;
  align-items: start;
  gap: 0.65rem !important;
  padding: 0.65rem;
  border-radius: 0.75rem;
  background: #faf8fc;
}

.toggle-row input {
  width: auto;
  margin-top: 0.18rem;
}

.toggle-row span {
  display: grid;
  gap: 0.1rem;
}

.public-toggle {
  background: #fff8ed;
}

.share-warning {
  padding: 0.75rem;
  border: 1px solid rgba(185, 124, 48, 0.2);
  border-radius: 0.75rem;
  background: #fff8ec;
  color: #7a5528;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.primary-button,
.secondary-button,
.text-button,
.danger-link {
  cursor: pointer;
  font: inherit;
  font-weight: 900;
}

.primary-button,
.secondary-button {
  min-height: 2.75rem;
  border-radius: 0.8rem;
  padding: 0.68rem 1rem;
}

.primary-button {
  border: 0;
  background: linear-gradient(135deg, #9b70c6, #e87bab);
  color: white;
}

.secondary-button {
  border: 1px solid rgba(91, 66, 108, 0.2);
  background: white;
  color: #5f496d;
}

.text-button,
.danger-link {
  border: 0;
  background: transparent;
}

.text-button {
  color: #765a8a;
}

.danger-link {
  color: #a84c5d;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.panel-heading {
  justify-content: space-between;
  gap: 1rem;
}

.empty-state {
  display: grid;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 0.9rem;
  background: #f8f5fa;
  color: #7d7184;
}

.server-card {
  min-width: 0;
  margin-top: 0.85rem;
  padding: 1rem;
  border: 1px solid rgba(89, 69, 103, 0.12);
  border-radius: 1rem;
  background: #fff;
}

.server-card-head {
  justify-content: space-between;
  gap: 0.85rem;
  min-width: 0;
}

.server-card-head > div {
  min-width: 0;
}

.server-title-line {
  flex-wrap: wrap;
  gap: 0.5rem;
}

.server-title-line h3 {
  margin: 0;
  color: #42344d;
  font-size: 1.1rem;
}

.server-card-head p {
  margin: 0.2rem 0;
  color: #786c80;
  font-size: 0.82rem;
}

.status-chip,
.key-saved {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.status-chip {
  background: #f0edf3;
  color: #766a7d;
}

.status-chip[data-status='ONLINE'] {
  background: #e8f7ee;
  color: #34714a;
}

.status-chip[data-status='OFFLINE'] {
  background: #fff0f1;
  color: #9b4d59;
}

.status-chip[data-status='DEGRADED'] {
  background: #fff6e4;
  color: #8a632d;
}

.key-saved {
  flex: 0 0 auto;
  background: #eef3ff;
  color: #536b9d;
}

.server-summary {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
  margin-top: 0.8rem;
  color: #867a8c;
  font-size: 0.72rem;
}

.server-summary code {
  min-width: 0;
  overflow: hidden;
  color: #67566f;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-settings {
  margin-top: 0.8rem;
  border-top: 1px solid rgba(86, 68, 97, 0.09);
  padding-top: 0.7rem;
}

.server-settings summary,
.shared-list summary {
  cursor: pointer;
  color: #705882;
  font-size: 0.8rem;
  font-weight: 900;
}

.settings-body {
  margin-top: 0.85rem;
}

.server-actions {
  justify-content: space-between;
  gap: 0.75rem;
}

.shared-list {
  margin-top: 1.1rem;
}

.shared-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.55rem;
  padding: 0.65rem;
  border-radius: 0.7rem;
  background: #f8f6fa;
  color: #736779;
  font-size: 0.75rem;
}

.shared-row span {
  display: grid;
  min-width: 0;
}

.status {
  margin-bottom: 1rem;
  padding: 0.8rem 1rem;
  border-radius: 0.85rem;
  font-size: 0.85rem;
  font-weight: 800;
}

.status.error {
  background: #fff0f2;
  color: #993b4d;
}

.status.notice {
  background: #ecf8f1;
  color: #387050;
}

.signed-out {
  max-width: 580px;
}

@media (max-width: 820px) {
  .servers-grid {
    grid-template-columns: 1fr;
  }

  .list-panel {
    order: -1;
  }
}

@media (max-width: 560px) {
  .servers-shell {
    padding-inline: 0.8rem;
  }

  .servers-brand span {
    display: none;
  }

  .servers-topbar nav {
    gap: 0.7rem;
    font-size: 0.82rem;
  }

  .ownership-note,
  .server-card-head,
  .server-summary,
  .shared-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .field-pair {
    grid-template-columns: 1fr;
  }

  .server-summary code {
    width: 100%;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .server-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
