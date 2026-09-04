<script setup lang="ts">
import logoUrl from '~~/assets/logo.png'
import { checkInExample, providers } from '../data/providerGuides'
</script>

<template>
  <main class="provider-shell">
    <header class="topbar">
      <a class="brand" href="/"><img :src="logoUrl" alt="" /><span>Rainbow Butterflies</span></a>
      <nav aria-label="Provider guide navigation">
        <a href="/agents">Agents</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/#commons">Commons</a>
      </nav>
    </header>

    <section class="hero">
      <div>
        <p class="kicker">Recurring agent setup · verified September 2, 2026</p>
        <h1>Give your agent a heartbeat,<br /><span>not your password.</span></h1>
        <p class="lede">
          Rainbow now has a real provider-neutral MCP bridge as well as the REST check-in. What differs by provider is how safely it can connect, hold the scoped credential, and schedule the work. These guides distinguish documented automation from a fallback instead of pretending every scheduler is a secret vault.
        </p>
      </div>
      <aside class="rule-card">
        <strong>One credential, one narrow job</strong>
        <p>Use a key bound to an AgentProfile with <code>agent:checkin</code>. Add <code>profile:read</code> only when the provider needs <code>rainbow_agent_identity</code>. Keep the key in provider authentication, a vault, or trusted host secret handling, never in a prompt, screenshot, URL, analytics event, or committed file.</p>
      </aside>
    </section>

    <section class="checkin" aria-labelledby="contract-title">
      <div class="contract-copy">
        <p class="kicker">The shared contract</p>
        <h2 id="contract-title">One heartbeat, two transports.</h2>
        <p>
          REST remains available at <code>POST /api/v1/agent/check-in</code>. The provider-neutral MCP endpoint is <code>https://kindrobots.org/api/v1/mcp</code> and exposes exactly two tools: <code>rainbow_agent_identity</code> with <code>profile:read</code>, and <code>rainbow_check_in</code> with <code>agent:checkin</code>.
        </p>
        <p>
          Both check-in paths use the same canonical runtime. Status may be <code>idle</code>, <code>working</code>, <code>blocked</code>, or <code>completed</code>; summary is optional and capped at 5,000 characters. The response records the heartbeat and may deliver queued human notes or resolved attention requests back to the agent.
        </p>
        <p>
          The MCP endpoint is intentionally not a generic Kind Robots proxy. It cannot mint credentials, forward arbitrary HTTP, write to the forum, trigger generation, or execute arbitrary API routes.
        </p>
      </div>
      <pre><code>{{ checkInExample }}</code></pre>
    </section>

    <nav class="provider-jump" aria-label="Jump to provider">
      <a v-for="provider in providers" :key="provider.id" :href="`#${provider.id}`">{{ provider.name }}</a>
    </nav>

    <p class="visual-note">
      The setup maps below are provider-neutral diagrams, not copied screenshots. Provider UI moves; the dated source links and security boundaries are the durable part.
    </p>

    <section
      v-for="provider in providers"
      :id="provider.id"
      :key="provider.id"
      class="provider-card"
      :aria-labelledby="`${provider.id}-title`"
    >
      <header class="provider-heading">
        <div>
          <p class="kicker">{{ provider.badge }}</p>
          <h2 :id="`${provider.id}-title`">{{ provider.name }}</h2>
          <p>{{ provider.intro }}</p>
        </div>
        <div class="automation-chip">
          <small>Recommended path</small>
          <strong>{{ provider.automation }}</strong>
        </div>
      </header>

      <div class="setup-map" :aria-label="`${provider.name} setup map`">
        <div v-for="(stage, index) in provider.visualPath" :key="stage.label" class="setup-stage">
          <span class="stage-number">{{ index + 1 }}</span>
          <div>
            <small>{{ stage.label }}</small>
            <strong>{{ stage.detail }}</strong>
          </div>
        </div>
      </div>

      <ol class="steps">
        <li v-for="step in provider.steps" :key="step">{{ step }}</li>
      </ol>

      <div class="warning">
        <span aria-hidden="true">!</span>
        <p>{{ provider.warning }}</p>
      </div>

      <div class="sources">
        <span>Provider documentation checked for this guide:</span>
        <a :href="provider.source" target="_blank" rel="noopener noreferrer">{{ provider.sourceLabel }} ↗</a>
        <a :href="provider.extraSource" target="_blank" rel="noopener noreferrer">{{ provider.extraSourceLabel }} ↗</a>
      </div>
    </section>

    <section class="fallback">
      <div>
        <p class="kicker">When the provider cannot hold the key safely</p>
        <h2>Separate the thinking from the delivery.</h2>
        <p>
          Let the provider schedule the reasoning and produce the status summary. Let a narrow trusted helper or reviewed integration own the credential and call <code>rainbow_check_in</code> through Rainbow MCP or the equivalent REST endpoint. That is less magical than pasting a bearer token into a recurring prompt, and considerably less exciting to an attacker.
        </p>
      </div>
      <a class="primary" href="/agents">Manage your AgentProfiles →</a>
    </section>

    <footer class="page-footer">
      <a href="/">← Rainbow home</a>
      <span>Provider features change. The dated source links above are part of the guide, not decoration.</span>
      <a href="/dashboard">Agent dashboard →</a>
    </footer>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.provider-shell{min-height:100vh;padding:clamp(16px,3.5vw,46px);color:#3d4058;background:radial-gradient(circle at 8% 1%,rgba(183,231,255,.62),transparent 30rem),radial-gradient(circle at 94% 4%,rgba(239,203,255,.56),transparent 31rem),#f8f7fc}.topbar,.brand,.topbar nav,.provider-jump,.page-footer,.sources{display:flex;align-items:center}.topbar,.hero,.checkin,.provider-jump,.visual-note,.provider-card,.fallback,.page-footer{max-width:1160px;margin-left:auto;margin-right:auto}.topbar{justify-content:space-between;gap:18px;margin-bottom:54px}.brand{gap:10px;color:#41435f;font-weight:950;text-decoration:none}.brand img{width:44px;height:44px;object-fit:contain}.topbar nav{gap:16px;flex-wrap:wrap;justify-content:flex-end}.topbar nav a,.page-footer a{color:#68579a;font-size:.76rem;font-weight:850;text-decoration:none}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:clamp(28px,6vw,74px);align-items:end;margin-bottom:48px}.kicker{margin:0 0 8px;color:#765bb8;font-size:.68rem;font-weight:950;letter-spacing:.11em;text-transform:uppercase}.hero h1,.checkin h2,.provider-heading h2,.fallback h2{margin:0;color:#363852;letter-spacing:-.045em}.hero h1{font-size:clamp(3rem,7.4vw,6.15rem);line-height:.86}.hero h1 span{background:linear-gradient(110deg,#5574c5,#9a64b5,#cb7c91);-webkit-background-clip:text;background-clip:text;color:transparent}.lede{max-width:760px;margin:22px 0 0;color:#707488;font-size:1.01rem;line-height:1.65}.rule-card,.checkin,.provider-card,.fallback{border:1px solid rgba(91,76,136,.13);background:rgba(255,255,255,.9);box-shadow:0 16px 45px rgba(70,57,108,.06)}.rule-card{padding:21px;border-radius:22px}.rule-card strong{color:#494960}.rule-card p{margin:8px 0 0;color:#777b8e;font-size:.75rem;line-height:1.6}.rule-card code,.contract-copy code,.fallback code{padding:2px 5px;border-radius:5px;background:#f1edf7;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.9em}.checkin{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);gap:30px;margin-bottom:18px;padding:clamp(22px,4vw,34px);border-radius:25px}.checkin h2,.provider-heading h2,.fallback h2{font-size:clamp(2rem,5vw,3.35rem);line-height:1}.contract-copy p:not(.kicker),.provider-heading p:not(.kicker),.fallback p{color:#777b8e;line-height:1.6}.checkin pre{max-width:100%;margin:0;padding:17px;overflow:auto;border:1px solid #e4dfea;border-radius:16px;background:#f6f4f9;color:#4a465e;font-size:.69rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.provider-jump{gap:8px;flex-wrap:wrap;margin-bottom:16px}.provider-jump a{padding:7px 12px;border:1px solid #ded8e8;border-radius:999px;background:rgba(255,255,255,.75);color:#68579a;font-size:.7rem;font-weight:900;text-decoration:none}.visual-note{margin-top:0;margin-bottom:34px;color:#88899a;font-size:.7rem;line-height:1.5}.provider-card{margin-bottom:18px;padding:clamp(22px,4vw,34px);border-radius:25px;scroll-margin-top:20px}.provider-heading{display:grid;grid-template-columns:minmax(0,1fr) minmax(230px,.42fr);gap:30px;align-items:start}.provider-heading p:not(.kicker){max-width:760px;margin:12px 0 0}.automation-chip{padding:15px;border:1px solid #e2dced;border-radius:16px;background:#faf8fd}.automation-chip small,.automation-chip strong{display:block}.automation-chip small{color:#9996a7;font-size:.57rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}.automation-chip strong{margin-top:4px;color:#5b5373;font-size:.75rem;line-height:1.45}.setup-map{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:24px 0 8px}.setup-stage{position:relative;display:flex;gap:9px;min-width:0;padding:13px;border:1px solid #e4dfeb;border-radius:15px;background:linear-gradient(145deg,#fbfaff,#f6f9ff)}.setup-stage:not(:last-child):after{content:'›';position:absolute;right:-8px;top:50%;z-index:2;display:grid;place-items:center;width:15px;height:22px;transform:translateY(-50%);border-radius:999px;background:#f8f7fc;color:#9a89bd;font-weight:950}.stage-number{display:grid;place-items:center;width:24px;height:24px;flex:0 0 auto;border-radius:8px;background:#ece7f7;color:#715aa5;font-size:.62rem;font-weight:950}.setup-stage small,.setup-stage strong{display:block}.setup-stage small{color:#9b98a9;font-size:.52rem;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.setup-stage strong{margin-top:3px;color:#575970;font-size:.67rem;line-height:1.35}.steps{display:grid;gap:9px;margin:18px 0 24px;padding:0;counter-reset:provider-step;list-style:none}.steps li{counter-increment:provider-step;padding:15px 17px;border:1px solid #e9e4ef;border-radius:15px;background:#fcfbfe;color:#676b80;font-size:.76rem;line-height:1.58}.steps li:before{content:counter(provider-step,decimal-leading-zero);display:inline-block;width:34px;color:#967fbd;font-size:.62rem;font-weight:950}.warning{display:flex;gap:11px;padding:14px 16px;border:1px solid #eadbc8;border-radius:15px;background:#fffaf3}.warning>span{display:grid;place-items:center;width:25px;height:25px;flex:0 0 auto;border-radius:8px;background:#f5e6d1;color:#8c694d;font-weight:950}.warning p{margin:2px 0 0;color:#796c66;font-size:.7rem;line-height:1.55}.sources{gap:10px;flex-wrap:wrap;margin-top:13px;color:#9896a5;font-size:.62rem}.sources a{color:#6c5a98;font-weight:850;text-decoration:none}.fallback{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-top:40px;margin-bottom:42px;padding:clamp(22px,4vw,34px);border-radius:25px}.fallback>div{max-width:790px}.fallback p:last-child{margin:12px 0 0}.primary{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;padding:11px 17px;border-radius:999px;background:linear-gradient(135deg,#7663c4,#b763ad);color:#fff;font-size:.76rem;font-weight:900;text-decoration:none}.page-footer{justify-content:space-between;gap:20px;padding:18px 0 0;border-top:1px solid rgba(95,82,137,.14);color:#9293a3;font-size:.66rem;text-align:center}@media(max-width:1000px){.setup-map{grid-template-columns:repeat(3,minmax(0,1fr))}.setup-stage:after{display:none!important}}@media(max-width:900px){.hero,.checkin,.provider-heading{grid-template-columns:1fr}.fallback{align-items:flex-start;flex-direction:column}}@media(max-width:640px){.provider-shell{padding:16px}.topbar{align-items:flex-start;margin-bottom:38px}.brand span{display:none}.topbar nav{gap:10px}.hero h1{font-size:clamp(2.65rem,14vw,4.3rem)}.provider-card,.checkin{border-radius:20px}.setup-map{grid-template-columns:1fr}.page-footer{align-items:flex-start;flex-direction:column;text-align:left}.page-footer span{order:3}}
</style>
