<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  name: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  uploaded: []
}>()

type AvatarUploadResponse = {
  success: boolean
  avatarImage?: string | null
  message?: string
}

const input = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const message = ref('')
const tone = ref<'error' | 'success'>('success')
const localPreview = ref('')

const preview = computed(() => localPreview.value || props.modelValue)
const initials = computed(() => props.name.trim().slice(0, 1).toUpperCase() || '•')

function pickImage() {
  if (!uploading.value) input.value?.click()
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: string }; message?: string }
    return candidate.data?.message || candidate.message || fallback
  }
  return fallback
}

async function onFilePicked(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    tone.value = 'error'
    message.value = 'Choose a PNG, JPEG, or WebP image.'
    target.value = ''
    return
  }

  if (file.size > 15 * 1024 * 1024) {
    tone.value = 'error'
    message.value = 'That image is over the 15 MB limit.'
    target.value = ''
    return
  }

  const temporaryPreview = URL.createObjectURL(file)
  localPreview.value = temporaryPreview
  uploading.value = true
  message.value = ''

  try {
    const body = new FormData()
    body.append('image', file, file.name)
    const result = await $fetch<AvatarUploadResponse>('/api/community/avatar', {
      method: 'POST',
      body,
    })

    if (!result.success || !result.avatarImage) {
      throw new Error(result.message || 'Avatar upload failed.')
    }

    emit('update:modelValue', result.avatarImage)
    emit('uploaded')
    tone.value = 'success'
    message.value = 'Avatar updated.'
  } catch (error) {
    localPreview.value = ''
    tone.value = 'error'
    message.value = messageFrom(error, 'Could not upload your avatar.')
  } finally {
    uploading.value = false
    target.value = ''
    URL.revokeObjectURL(temporaryPreview)
    if (tone.value === 'success') localPreview.value = ''
  }
}

function onPreviewError() {
  localPreview.value = ''
}
</script>

<template>
  <div class="avatar-picker">
    <span class="field-label">Profile image <small>PNG, JPEG or WebP</small></span>
    <div class="avatar-picker-body">
      <button
        class="avatar-preview"
        type="button"
        :disabled="uploading"
        :aria-label="preview ? 'Replace profile image' : 'Choose profile image'"
        @click="pickImage"
      >
        <img v-if="preview" :src="preview" alt="Your profile image" @error="onPreviewError" />
        <span v-else>{{ initials }}</span>
        <span class="avatar-overlay">{{ uploading ? 'Uploading…' : 'Change' }}</span>
      </button>
      <div class="avatar-actions">
        <strong>{{ preview ? 'Make it yours.' : 'Add a face to your profile.' }}</strong>
        <p>Choose an image from your device. Rainbow stores it with your Kind Robots account.</p>
        <button type="button" :disabled="uploading" @click="pickImage">
          {{ uploading ? 'Uploading…' : preview ? 'Replace image' : 'Choose image' }}
        </button>
        <span v-if="message" class="avatar-status" :class="tone" role="status">{{ message }}</span>
      </div>
    </div>
    <input
      ref="input"
      class="sr-only"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      @change="onFilePicked"
    />
  </div>
</template>

<style scoped>
.avatar-picker{min-width:0}.field-label{display:block;margin-bottom:6px;font-size:.72rem;font-weight:850}.field-label small{color:#9a9cab;font-weight:600}.avatar-picker-body{display:flex;align-items:center;gap:14px;min-height:112px;border:1px solid #ddd9e8;border-radius:16px;background:linear-gradient(145deg,#fbfaff,#f5f0ff);padding:12px}.avatar-preview{position:relative;width:96px;height:96px;flex:0 0 96px;overflow:hidden;border:0;border-radius:24px;background:linear-gradient(145deg,#dff4ff,#eee3ff);padding:0;color:#5d5682;font:inherit;font-size:1.8rem;font-weight:950;cursor:pointer;box-shadow:0 8px 20px rgba(77,60,120,.12)}.avatar-preview img{width:100%;height:100%;object-fit:cover}.avatar-overlay{position:absolute;inset:auto 0 0;padding:6px;background:rgba(35,29,58,.72);color:#fff;font-size:.64rem;font-weight:900;letter-spacing:.03em}.avatar-preview:disabled{cursor:wait;opacity:.78}.avatar-actions{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:5px}.avatar-actions strong{color:#41435f;font-size:.86rem}.avatar-actions p{margin:0;color:#7b7d90;font-size:.72rem;line-height:1.4}.avatar-actions button{margin-top:3px;border:0;border-radius:999px;background:#6954a3;padding:8px 13px;color:white;font:inherit;font-size:.7rem;font-weight:900;cursor:pointer}.avatar-actions button:disabled{opacity:.55;cursor:wait}.avatar-status{font-size:.68rem;font-weight:750}.avatar-status.success{color:#477a63}.avatar-status.error{color:#af3f53}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:620px){.avatar-picker-body{align-items:flex-start}.avatar-preview{width:84px;height:84px;flex-basis:84px;border-radius:21px}}
</style>
