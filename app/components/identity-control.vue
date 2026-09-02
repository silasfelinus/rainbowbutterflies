<script setup lang="ts">
import { computed, ref } from 'vue'

type AuthState =
  | {
      authenticated: true
      user: { id: number; username: string }
      expiresAt: string
    }
  | {
      authenticated: false
      user: null
      expiresAt: null
    }

const signedOutState = (): AuthState => ({
  authenticated: false,
  user: null,
  expiresAt: null,
})

const { data: authState, status } = await useFetch<AuthState>('/api/auth/me', {
  key: 'rainbow-auth-me',
  server: true,
  default: signedOutState,
})

const signingOut = ref(false)
const username = computed(() =>
  authState.value.authenticated ? authState.value.user.username : '',
)

async function signOut() {
  if (signingOut.value) return
  signingOut.value = true

  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    authState.value = signedOutState()
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <div class="identity-control" aria-label="Rainbow Butterflies account">
    <span v-if="status === 'pending'" class="identity-loading" aria-live="polite">
      Checking sign-in…
    </span>

    <template v-else-if="authState.authenticated">
      <a
        class="identity-name"
        href="/notifications"
        :title="`Notification settings for ${username}`"
      >
        <span class="identity-dot" aria-hidden="true" />
        <span class="identity-copy">
          <small>Account</small>
          <strong>{{ username }}</strong>
        </span>
      </a>
      <button
        type="button"
        class="identity-signout"
        :disabled="signingOut"
        @click="signOut"
      >
        {{ signingOut ? 'Signing out…' : 'Sign out' }}
      </button>
    </template>

    <a
      v-else
      class="button button-quiet identity-signin"
      href="/login?returnTo=%2F%23commons"
      aria-label="Sign in to Rainbow Butterflies"
    >
      <span class="signin-wide">Sign in</span>
      <span class="signin-short">Sign in</span>
    </a>
  </div>
</template>

<style scoped>
.identity-control {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.identity-loading {
  color: var(--ink-soft, #68617a);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.identity-name {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  max-width: 11rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid rgba(117, 97, 165, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  text-decoration: none;
}

.identity-name:hover {
  border-color: rgba(117, 97, 165, 0.32);
}

.identity-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #56bd87;
  box-shadow: 0 0 0 3px rgba(86, 189, 135, 0.14);
}

.identity-copy {
  display: grid;
  min-width: 0;
  line-height: 1.05;
}

.identity-copy small {
  color: #817991;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.identity-copy strong {
  overflow: hidden;
  color: #40384d;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.identity-signout {
  padding: 0.35rem 0.15rem;
  border: 0;
  background: transparent;
  color: #71687e;
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
}

.identity-signout:hover:not(:disabled) {
  color: #4c3b68;
  text-decoration: underline;
}

.identity-signout:disabled {
  cursor: wait;
  opacity: 0.6;
}

.identity-signin {
  white-space: nowrap;
}

.signin-short {
  display: none;
}

@media (max-width: 760px) {
  .identity-control {
    gap: 0.3rem;
  }

  .identity-loading {
    display: none;
  }

  .identity-name {
    max-width: 7rem;
    padding: 0.3rem 0.45rem;
  }

  .identity-copy small {
    display: none;
  }

  .identity-signout {
    font-size: 0.66rem;
  }

  .identity-signin {
    min-height: 38px;
    padding: 8px 11px;
    font-size: 0.78rem;
  }

  .signin-wide {
    display: none;
  }

  .signin-short {
    display: inline;
  }
}

@media (max-width: 430px) {
  .identity-signout {
    display: none;
  }

  .identity-name {
    max-width: 5.5rem;
  }
}
</style>
