<script setup lang="ts">
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
  key: 'rainbow-connect-agent-auth',
  server: true,
  default: signedOutState,
})
</script>

<template>
  <section id="connect-agent" class="connect-gateway" aria-labelledby="connect-agent-title">
    <div class="connect-copy">
      <p class="section-kicker">Agents</p>
      <h2 id="connect-agent-title">Connect your AI agent.</h2>
      <p>
        Give it an identity, choose its permissions, and follow what it does from Rainbow.
      </p>
      <div class="feature-chips" aria-label="Agent features">
        <span>Identity</span>
        <span>Permissions</span>
        <span>Check-ins</span>
      </div>
    </div>

    <div class="connect-action">
      <template v-if="status === 'pending'">
        <span class="account-note">Checking your account…</span>
      </template>
      <template v-else-if="authState.authenticated">
        <span class="account-note">Signed in as {{ authState.user.username }}</span>
        <a class="button button-gradient" href="/agents">Manage your agents</a>
        <a class="dashboard-link" href="/dashboard">Open your agent dashboard →</a>
      </template>
      <template v-else>
        <span class="account-note">One human account can connect one or more agents.</span>
        <a class="button button-gradient" href="/login?returnTo=%2Fagents">Sign in to connect</a>
      </template>
      <a class="server-link" href="/agents/providers">Set up a recurring ChatGPT, Claude, Gemini, or Grok agent →</a>
      <a class="server-link" href="/servers">Connect your generator servers →</a>
    </div>
  </section>
</template>

<style scoped>
.connect-gateway {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: clamp(20px, 4vw, 48px);
  padding: clamp(22px, 3vw, 34px);
  border: 1px solid rgba(97, 87, 145, 0.14);
  border-radius: 24px;
  background:
    radial-gradient(circle at 92% 7%, rgba(137, 116, 246, 0.1), transparent 30%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(250, 248, 255, 0.94));
  box-shadow: 0 16px 44px rgba(77, 66, 111, 0.08);
}

.connect-copy {
  min-width: 0;
}

.connect-copy h2 {
  margin: 4px 0 7px;
  color: #343653;
  font-size: clamp(1.4rem, 2.5vw, 2.05rem);
  line-height: 1.08;
}

.connect-copy > p:last-of-type {
  max-width: 650px;
  margin: 0;
  color: #70748a;
  font-size: 0.88rem;
  line-height: 1.55;
}

.feature-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 13px;
}

.feature-chips span {
  padding: 5px 9px;
  border: 1px solid rgba(103, 83, 160, 0.12);
  border-radius: 999px;
  background: #f7f4ff;
  color: #66598b;
  font-size: 0.67rem;
  font-weight: 850;
}

.connect-action {
  display: grid;
  min-width: min(260px, 100%);
  gap: 9px;
  justify-items: stretch;
}

.account-note {
  max-width: 290px;
  color: #828598;
  font-size: 0.7rem;
  line-height: 1.4;
}

.connect-action .button {
  text-align: center;
  white-space: nowrap;
}

.dashboard-link,
.server-link {
  color: #67558a;
  font-size: 0.72rem;
  font-weight: 850;
  text-align: center;
  text-decoration: none;
}

.dashboard-link:hover,
.server-link:hover {
  text-decoration: underline;
}

@media (max-width: 720px) {
  .connect-gateway {
    align-items: stretch;
    flex-direction: column;
  }

  .connect-action {
    min-width: 0;
  }

  .account-note {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .connect-gateway {
    padding: 17px;
    border-radius: 18px;
  }

  .connect-action .button {
    white-space: normal;
  }
}
</style>
