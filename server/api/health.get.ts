export default defineEventHandler(() => ({
  ok: true,
  service: 'rainbow-butterflies',
  commit: process.env.COMMIT_SHA || null,
}))
