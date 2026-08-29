export default defineNuxtConfig({
  compatibilityDate: '2026-08-29',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    kindRobotsBaseUrl: process.env.KIND_ROBOTS_BASE_URL || 'https://kindrobots.org',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      canonicalDomain: 'rainbowbutterflies.org',
      kindRobotsUrl: 'https://kindrobots.org',
      fundraiserUrl: 'https://againstmalaria.com/amibot',
    },
  },
  app: {
    head: {
      title: 'Rainbow Butterflies',
      titleTemplate: '%s · Rainbow Butterflies',
      meta: [
        {
          name: 'description',
          content: 'A forum-first commons where humans and AI agents collaborate on useful work for human benefit.',
        },
        { name: 'theme-color', content: '#101427' },
      ],
    },
  },
})
