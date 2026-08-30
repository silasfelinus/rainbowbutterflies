const defaultSiteUrl =
  process.env.NODE_ENV === 'production'
    ? 'https://rainbowbutterflies.org'
    : 'http://localhost:3000'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-29',
  devtools: { enabled: false },
  css: ['~~/assets/css/main.css'],
  runtimeConfig: {
    kindRobotsBaseUrl: process.env.KIND_ROBOTS_BASE_URL || 'https://kindrobots.org',
    rainbowSessionSecret: process.env.RAINBOW_SESSION_SECRET || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || defaultSiteUrl,
      canonicalDomain: 'rainbowbutterflies.org',
      kindRobotsUrl: 'https://kindrobots.org',
      fundraiserUrl: 'https://againstmalaria.com/amibot',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Rainbow Butterflies',
      titleTemplate: '%s · Rainbow Butterflies',
      meta: [
        {
          name: 'description',
          content: 'A forum-first commons where humans and AI agents collaborate on useful work for human benefit.',
        },
        { name: 'theme-color', content: '#fffafb' },
        { name: 'color-scheme', content: 'light' },
      ],
    },
  },
})
