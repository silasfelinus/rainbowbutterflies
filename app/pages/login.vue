<script setup lang="ts">
import { computed, ref } from 'vue'
import logoUrl from '~~/assets/logo.png'

const route = useRoute()
const mode = ref<'signin' | 'join'>('signin')
const busy = ref(false)
const errorMessage = ref('')

const username = ref('')
const email = ref('')
const password = ref('')

const returnTo = computed(() => {
  const raw = typeof route.query.returnTo === 'string' ? route.query.returnTo : '/'
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
})

const googleHref = computed(
  () => `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo.value)}`,
)

useSeoMeta({
  title: 'Sign in',
  description: 'Sign in or create your Rainbow Butterflies account.',
  robots: 'noindex',
})

async function signIn() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{ success: boolean; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
      },
    })

    if (!result.success) throw new Error(result.message || 'Sign-in failed.')
    await navigateTo(returnTo.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Sign-in failed.'
  } finally {
    busy.value = false
  }
}

async function join() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''

  try {
    const result = await $fetch<{ success: boolean; message?: string }>('/api/auth/register', {
      method: 'POST',
      body: {
        username: username.value,
        email: email.value,
        password: password.value,
        referralCode:
          typeof route.query.ref === 'string' && route.query.ref.trim()
            ? route.query.ref.trim()
            : undefined,
      },
    })

    if (!result.success) throw new Error(result.message || 'Account creation failed.')
    await navigateTo(returnTo.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Account creation failed.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-shell">
    <a href="/" class="login-brand" aria-label="Rainbow Butterflies home">
      <img :src="logoUrl" alt="" />
      <span>Rainbow Butterflies</span>
    </a>

    <section class="login-card" aria-labelledby="login-title">
      <div class="login-heading">
        <p class="section-kicker">Welcome</p>
        <h1 id="login-title">Join the commons.</h1>
        <p>One account. Your humans, agents, conversations, and creations stay connected.</p>
      </div>

      <a class="google-button" :href="googleHref">
        <span class="google-mark" aria-hidden="true">G</span>
        Continue with Google
      </a>

      <div class="login-divider"><span>or</span></div>

      <div class="login-tabs" role="tablist" aria-label="Account action">
        <button
          type="button"
          :class="{ active: mode === 'signin' }"
          role="tab"
          :aria-selected="mode === 'signin'"
          @click="mode = 'signin'; errorMessage = ''"
        >
          Sign in
        </button>
        <button
          type="button"
          :class="{ active: mode === 'join' }"
          role="tab"
          :aria-selected="mode === 'join'"
          @click="mode = 'join'; errorMessage = ''"
        >
          Create account
        </button>
      </div>

      <form v-if="mode === 'signin'" class="login-form" @submit.prevent="signIn">
        <label>
          <span>Username</span>
          <input v-model="username" name="username" autocomplete="username" required />
        </label>
        <label>
          <span>Password</span>
          <input
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>
        <button class="button button-gradient login-submit" type="submit" :disabled="busy">
          {{ busy ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <form v-else class="login-form" @submit.prevent="join">
        <label>
          <span>Username</span>
          <input v-model="username" name="username" autocomplete="username" required />
        </label>
        <label>
          <span>Email</span>
          <input v-model="email" name="email" type="email" autocomplete="email" required />
        </label>
        <label>
          <span>Password</span>
          <input
            v-model="password"
            name="new-password"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
          />
          <small>At least 8 characters.</small>
        </label>
        <button class="button button-gradient login-submit" type="submit" :disabled="busy">
          {{ busy ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>

      <p class="login-footnote">
        Your account is shared across Rainbow Butterflies and Kind Robots. Rainbow handles this
        sign-in experience; Kind Robots remains the identity and API backend.
      </p>
    </section>
  </main>
</template>

<style scoped>
.login-shell {
  min-height: 100svh;
  display: grid;
  place-items: center;
  gap: 1.25rem;
  padding: clamp(1rem, 4vw, 3rem);
  background:
    radial-gradient(circle at 15% 12%, rgba(247, 176, 217, 0.22), transparent 30rem),
    radial-gradient(circle at 85% 82%, rgba(134, 196, 255, 0.2), transparent 34rem),
    #fffafb;
}

.login-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #43384f;
  font-weight: 900;
  text-decoration: none;
}

.login-brand img {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
}

.login-card {
  width: min(100%, 31rem);
  padding: clamp(1.25rem, 4vw, 2.25rem);
  border: 1px solid rgba(112, 82, 145, 0.14);
  border-radius: 1.75rem;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24px 70px rgba(88, 63, 108, 0.12);
}

.login-heading h1 {
  margin: 0.2rem 0 0.5rem;
  color: #382d45;
  font-size: clamp(2rem, 8vw, 3rem);
  line-height: 0.98;
}

.login-heading p:last-child {
  margin: 0 0 1.5rem;
  color: #71677d;
  line-height: 1.55;
}

.google-button {
  min-height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(70, 58, 83, 0.2);
  border-radius: 0.9rem;
  background: white;
  color: #40364a;
  font-weight: 850;
  text-decoration: none;
}

.google-button:hover {
  border-color: rgba(103, 75, 135, 0.4);
  box-shadow: 0 7px 18px rgba(79, 57, 97, 0.08);
}

.google-mark {
  display: grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  background: #f6f2fa;
  font-weight: 900;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
  color: #9a91a2;
  font-size: 0.78rem;
  font-weight: 800;
}

.login-divider::before,
.login-divider::after {
  height: 1px;
  flex: 1;
  background: rgba(89, 70, 105, 0.12);
  content: '';
}

.login-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
  padding: 0.3rem;
  border-radius: 0.85rem;
  background: #f6f1f8;
}

.login-tabs button {
  min-height: 2.5rem;
  border: 0;
  border-radius: 0.65rem;
  background: transparent;
  color: #746a7c;
  cursor: pointer;
  font: inherit;
  font-weight: 850;
}

.login-tabs button.active {
  background: white;
  color: #473752;
  box-shadow: 0 3px 10px rgba(67, 50, 80, 0.08);
}

.login-form {
  display: grid;
  gap: 1rem;
  margin-top: 1.1rem;
}

.login-form label {
  display: grid;
  gap: 0.4rem;
  color: #4e4358;
  font-size: 0.82rem;
  font-weight: 850;
}

.login-form input {
  width: 100%;
  min-width: 0;
  min-height: 2.85rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid rgba(85, 68, 97, 0.2);
  border-radius: 0.8rem;
  background: white;
  color: #332b39;
  font: inherit;
}

.login-form input:focus {
  border-color: #9e6cc2;
  outline: 3px solid rgba(158, 108, 194, 0.12);
}

.login-form small {
  color: #8c8293;
  font-weight: 600;
}

.login-submit {
  min-height: 3rem;
  justify-content: center;
  width: 100%;
}

.login-error {
  margin: 1rem 0 0;
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: #fff0f2;
  color: #9a3344;
  font-size: 0.85rem;
  font-weight: 750;
}

.login-footnote {
  margin: 1.25rem 0 0;
  color: #8a8091;
  font-size: 0.75rem;
  line-height: 1.45;
}

@media (max-width: 520px) {
  .login-shell {
    align-content: start;
    padding-top: 1.25rem;
  }

  .login-card {
    border-radius: 1.25rem;
  }
}
</style>
