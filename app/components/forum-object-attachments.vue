<script setup lang="ts">
import type { ForumAttachment } from '~~/utils/forumContract'

defineProps<{
  attachments: ForumAttachment[]
}>()

function kindLabel(kind: ForumAttachment['kind']) {
  return kind === 'ART_IMAGE' ? 'Kind Robots art' : 'Kind Robots project'
}

function kindGlyph(kind: ForumAttachment['kind']) {
  return kind === 'ART_IMAGE' ? '✦' : '◇'
}
</script>

<template>
  <div v-if="attachments.length" class="object-attachments" aria-label="Attached Kind Robots objects">
    <a
      v-for="attachment in attachments"
      :key="`${attachment.kind}:${attachment.id}`"
      class="object-card"
      :href="attachment.canonicalUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div class="object-image" :class="{ empty: !attachment.imageUrl }">
        <img
          v-if="attachment.imageUrl"
          :src="attachment.imageUrl"
          :alt="attachment.title"
          loading="lazy"
          decoding="async"
        />
        <span v-else aria-hidden="true">{{ kindGlyph(attachment.kind) }}</span>
      </div>

      <div class="object-copy">
        <small>{{ kindLabel(attachment.kind) }} · #{{ attachment.id }}</small>
        <strong>{{ attachment.title }}</strong>
        <p v-if="attachment.summary">{{ attachment.summary }}</p>
        <span>Open canonical object ↗</span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.object-attachments{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px;margin-top:11px}.object-card{display:grid;grid-template-columns:82px minmax(0,1fr);min-width:0;overflow:hidden;border:1px solid rgba(91,82,154,.14);border-radius:12px;background:linear-gradient(145deg,rgba(248,245,255,.95),rgba(255,252,247,.96));color:inherit;text-decoration:none;transition:.15s}.object-card:hover{transform:translateY(-1px);border-color:rgba(119,85,198,.3);box-shadow:0 8px 20px rgba(74,72,123,.1)}.object-image{min-height:86px;background:#efedf7}.object-image img{display:block;width:100%;height:100%;min-height:86px;object-fit:cover}.object-image.empty{display:grid;place-items:center;color:#7254bb;font-size:1.25rem;background:linear-gradient(145deg,#f0eaff,#edf7ff)}.object-copy{display:grid;align-content:center;gap:3px;min-width:0;padding:9px 10px}.object-copy small{color:#8a8ea1;font-size:.52rem;font-weight:850;text-transform:uppercase;letter-spacing:.04em}.object-copy strong{overflow:hidden;color:#353c65;font-size:.7rem;line-height:1.25;text-overflow:ellipsis;white-space:nowrap}.object-copy p{display:-webkit-box;overflow:hidden;margin:0;color:#747a92;font-size:.58rem;line-height:1.4;-webkit-box-orient:vertical;-webkit-line-clamp:2}.object-copy span{margin-top:2px;color:#6d50b2;font-size:.55rem;font-weight:850}@media(max-width:520px){.object-card{grid-template-columns:68px minmax(0,1fr)}.object-image,.object-image img{min-height:76px}}
</style>
