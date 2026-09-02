<script setup lang="ts">
import logoUrl from '~~/assets/logo.png'

const config = useRuntimeConfig()
const fundraiserUrl = config.public.fundraiserUrl as string
const kindRobotsUrl = config.public.kindRobotsUrl as string

const liveNow = [
  {
    title: 'Direct Against Malaria giving',
    copy: 'Rainbow links donors out to the Against Malaria fundraiser. Those donations do not pass through Rainbow Butterflies or AMI.',
  },
  {
    title: 'Generation resource accounting',
    copy: 'Kind Robots already tracks generation resources and Rainbow exposes a human-level daily Krea 2 allowance. Resource spending pays for computation; it is not currently a malaria donation.',
  },
  {
    title: 'Canonical ownership + provenance',
    copy: 'Kind Robots owns the durable user, object, generation, and attribution records that future creator economics can build on.',
  },
]

const beingBuilt = [
  {
    title: 'Auditable paid-use split',
    copy: 'The current design direction is to split eligible net paid use between the platform, the creator whose work was used, and the public-good mission. The ledger and real-money path are not live or verified yet.',
  },
  {
    title: 'Creator attribution and accrual',
    copy: 'Kind Economy is defining how a paid interaction names the eligible creator contribution and accumulates a creator share without losing provenance.',
  },
  {
    title: 'Mission remittance',
    copy: 'The project is researching how a mission share can reach malaria prevention cleanly and audibly. Until that path exists, direct giving remains the real mission-money route.',
  },
]

const longTerm = [
  'Creators selling custom art packs or other reusable Kind Robots content.',
  'Referral rewards tied to verified paid purchases rather than vanity traffic.',
  'Revenue sharing when eligible creator-authored Storymaker or other reusable content drives paid use.',
  'Additional creator, platform, and public-good mechanics only after the accounting is implemented and tested.',
]

useSeoMeta({
  title: 'Kind Economy',
  description:
    'What Kind Robots resource accounting and Rainbow Butterflies fundraising do today, what Kind Economy is building, and what remains long-term direction.',
})
</script>

<template>
  <main class="economy-shell">
    <header class="topbar">
      <a class="brand" href="/">
        <img :src="logoUrl" alt="" />
        <span>Rainbow Butterflies</span>
      </a>
      <nav aria-label="Economy navigation">
        <a href="/mission">Mission</a>
        <a href="/community">Community</a>
        <a href="/generate">Generate</a>
        <a :href="fundraiserUrl" target="_blank" rel="noopener noreferrer">Donate ↗</a>
      </nav>
    </header>

    <section class="hero">
      <div>
        <p class="kicker">Kind Economy</p>
        <h1>Make the money claims<br /><span>as auditable as the code.</span></h1>
        <p class="lede">
          The long-term goal is for paid Kind Robots activity to support creators, the platform, and public-good work. That is a design direction, not a current promise. This page separates the pieces that exist today from the accounting still being built.
        </p>
      </div>

      <aside class="truth-card">
        <span class="truth-icon" aria-hidden="true">✓</span>
        <div>
          <strong>The rule</strong>
          <p>Never describe a planned revenue split as money already moving. A token, generation request, or creator attribution becomes mission revenue only after Kind Economy implements and verifies that exact path.</p>
        </div>
      </aside>
    </section>

    <section class="status-section available" aria-labelledby="available-title">
      <header class="status-heading">
        <div class="status-label"><span />Available now</div>
        <h2 id="available-title">Things you can rely on today.</h2>
        <p>These are live product behaviors. None of them imply that compute spending currently funds malaria or pays a creator.</p>
      </header>
      <div class="card-grid">
        <article v-for="item in liveNow" :key="item.title">
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </div>
    </section>

    <section class="status-section building" aria-labelledby="building-title">
      <header class="status-heading">
        <div class="status-label"><span />Being built</div>
        <h2 id="building-title">The accounting has to earn the claim.</h2>
        <p>Kind Economy owns this money plumbing. Real Stripe charges, payout configuration, and actual mission remittance remain explicitly gated until they are deliberately tested and approved.</p>
      </header>
      <div class="card-grid">
        <article v-for="item in beingBuilt" :key="item.title">
          <h3>{{ item.title }}</h3>
          <p>{{ item.copy }}</p>
        </article>
      </div>

      <div class="split-diagram" aria-label="Planned eligible net paid-use split">
        <div>
          <small>planned eligible net paid use</small>
          <strong>after payment fees and direct compute cost</strong>
        </div>
        <span aria-hidden="true">→</span>
        <div class="split-parts">
          <b>Platform</b>
          <b>Creator</b>
          <b>Mission</b>
        </div>
      </div>
      <p class="diagram-note">This illustrates the current design direction. It is not a live payout statement, invoice promise, or claim that any specific token purchase has already been split.</p>
    </section>

    <section class="status-section direction" aria-labelledby="direction-title">
      <header class="status-heading">
        <div class="status-label"><span />Long-term direction</div>
        <h2 id="direction-title">An economy for reusable creative work.</h2>
        <p>The aim is to make useful creator contributions economically reusable without quietly changing what free and self-hosted use means.</p>
      </header>
      <ol class="future-list">
        <li v-for="item in longTerm" :key="item">{{ item }}</li>
      </ol>
    </section>

    <section class="donation-boundary">
      <div>
        <p class="kicker">The clean boundary today</p>
        <h2>Want to support malaria prevention right now?</h2>
        <p>Use the direct Against Malaria fundraiser. That is the verified path today, separate from Kind Robots compute resources and future Kind Economy revenue sharing.</p>
      </div>
      <a class="primary" :href="fundraiserUrl" target="_blank" rel="noopener noreferrer">Give directly ↗</a>
    </section>

    <section class="questions">
      <article>
        <strong>Does buying or spending Kind Robots tokens currently donate to malaria prevention?</strong>
        <p>No. Not unless and until Kind Economy implements and verifies that accounting path.</p>
      </article>
      <article>
        <strong>Are creators currently receiving revenue shares from Rainbow or Kind Robots?</strong>
        <p>No verified creator payout system is live yet. The product should not imply otherwise.</p>
      </article>
      <article>
        <strong>Where should the eventual ledger live?</strong>
        <p>In the canonical Kind Robots / Kind Economy backend, not in a parallel Rainbow payment database.</p>
      </article>
    </section>

    <footer class="page-footer">
      <a href="/mission">← Mission & values</a>
      <span>Present tense for what exists. Future tense for what is planned.</span>
      <a :href="kindRobotsUrl" target="_blank" rel="noopener noreferrer">Kind Robots ↗</a>
    </footer>
  </main>
</template>

<style scoped>
*{box-sizing:border-box}.economy-shell{min-height:100vh;padding:clamp(16px,3.5vw,46px);color:#3d4058;background:radial-gradient(circle at 9% 0,rgba(189,232,255,.62),transparent 30rem),radial-gradient(circle at 93% 4%,rgba(239,204,255,.55),transparent 30rem),#f8f7fc}.topbar,.brand,.topbar nav,.page-footer,.split-diagram,.split-parts{display:flex;align-items:center}.topbar,.hero,.status-section,.donation-boundary,.questions,.page-footer{max-width:1160px;margin-left:auto;margin-right:auto}.topbar{justify-content:space-between;gap:18px;margin-bottom:54px}.brand{gap:10px;color:#41435f;font-weight:950;text-decoration:none}.brand img{width:44px;height:44px;object-fit:contain}.topbar nav{gap:16px;flex-wrap:wrap;justify-content:flex-end}.topbar nav a,.page-footer a{color:#68579a;font-size:.76rem;font-weight:850;text-decoration:none}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:clamp(28px,6vw,74px);align-items:end;margin-bottom:68px}.kicker{margin:0 0 8px;color:#765bb8;font-size:.68rem;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.hero h1,.status-heading h2,.donation-boundary h2{margin:0;color:#363852;letter-spacing:-.045em}.hero h1{font-size:clamp(3rem,7.5vw,6.2rem);line-height:.86}.hero h1 span{background:linear-gradient(110deg,#5575c5,#9863b2,#c87f91);-webkit-background-clip:text;background-clip:text;color:transparent}.lede{max-width:760px;margin:22px 0 0;color:#707488;font-size:1.02rem;line-height:1.65}.truth-card,.card-grid article,.split-diagram,.donation-boundary,.questions article{border:1px solid rgba(91,76,136,.13);background:rgba(255,255,255,.9);box-shadow:0 16px 45px rgba(70,57,108,.06)}.truth-card{display:flex;gap:14px;padding:21px;border-radius:23px}.truth-icon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 auto;border-radius:12px;background:#eaf7ed;color:#4f8460;font-weight:950}.truth-card strong{color:#494960}.truth-card p{margin:7px 0 0;color:#777b8e;font-size:.75rem;line-height:1.6}.status-section{margin-bottom:64px}.status-heading{max-width:790px;margin-bottom:21px}.status-label{display:inline-flex;align-items:center;gap:8px;margin-bottom:10px;color:#6d6580;font-size:.65rem;font-weight:950;letter-spacing:.09em;text-transform:uppercase}.status-label span{width:9px;height:9px;border-radius:50%;background:#74b98a}.building .status-label span{background:#d5a25f}.direction .status-label span{background:#8b82c8}.status-heading h2,.donation-boundary h2{font-size:clamp(2rem,5vw,3.45rem);line-height:1}.status-heading p,.donation-boundary p,.questions p{color:#797c8f;line-height:1.6}.status-heading p{margin:12px 0 0}.card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.card-grid article{padding:21px;border-radius:20px}.card-grid h3{margin:0 0 8px;color:#474960}.card-grid p{margin:0;color:#797c8f;font-size:.75rem;line-height:1.6}.split-diagram{gap:18px;justify-content:space-between;margin-top:15px;padding:20px;border-radius:20px}.split-diagram small,.split-diagram strong{display:block}.split-diagram small{color:#9997a7;font-size:.61rem;font-weight:900;text-transform:uppercase}.split-diagram strong{margin-top:4px;color:#4a4a63;font-size:.82rem}.split-diagram>span{color:#aaa2bc;font-size:1.3rem}.split-parts{gap:7px;flex-wrap:wrap;justify-content:flex-end}.split-parts b{padding:8px 11px;border-radius:999px;background:#f0ecf7;color:#67598c;font-size:.68rem}.diagram-note{margin:9px 0 0;color:#9696a5;font-size:.65rem;line-height:1.5}.future-list{display:grid;gap:9px;margin:0;padding:0;list-style:none;counter-reset:future}.future-list li{counter-increment:future;padding:16px 18px;border:1px solid #e6e1ed;border-radius:16px;background:rgba(255,255,255,.76);color:#696d82;font-size:.78rem;line-height:1.55}.future-list li:before{content:counter(future,decimal-leading-zero);display:inline-block;width:34px;color:#9784bd;font-size:.65rem;font-weight:950}.donation-boundary{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-bottom:28px;padding:clamp(22px,4vw,34px);border-radius:26px}.donation-boundary>div{max-width:760px}.donation-boundary p:last-child{margin:12px 0 0}.primary{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;padding:11px 17px;border-radius:999px;background:linear-gradient(135deg,#7663c4,#b763ad);color:#fff;font-size:.76rem;font-weight:900;text-decoration:none}.questions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:42px}.questions article{padding:18px;border-radius:18px}.questions strong{color:#48495f;font-size:.8rem;line-height:1.45}.questions p{margin:8px 0 0;font-size:.72rem}.page-footer{justify-content:space-between;gap:20px;padding:18px 0 0;border-top:1px solid rgba(95,82,137,.14);color:#9293a3;font-size:.66rem;text-align:center}@media(max-width:900px){.hero{grid-template-columns:1fr}.card-grid,.questions{grid-template-columns:1fr}.split-diagram{align-items:flex-start;flex-direction:column}.split-diagram>span{transform:rotate(90deg)}.split-parts{justify-content:flex-start}.donation-boundary{align-items:flex-start;flex-direction:column}}@media(max-width:640px){.economy-shell{padding:16px}.topbar{align-items:flex-start;margin-bottom:38px}.brand span{display:none}.topbar nav{gap:10px}.hero{margin-bottom:48px}.hero h1{font-size:clamp(2.65rem,14vw,4.3rem)}.page-footer{align-items:flex-start;flex-direction:column;text-align:left}.page-footer span{order:3}}
</style>
