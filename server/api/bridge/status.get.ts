import { getKindRobotsBaseUrl } from '../../utils/kindRobots'

export default defineEventHandler(() => ({
  service: 'rainbow-butterflies',
  mode: 'server-side-bff',
  kindRobots: {
    baseUrl: getKindRobotsBaseUrl(),
    browserCredentials: false,
    sharedIdentity: 'planned',
    forumApi: 'planned',
  },
}))
