function normalizeBaseUrl(value: string) {
  const parsed = new URL(value)

  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    throw new Error('KIND_ROBOTS_BASE_URL must use https outside local development')
  }

  return parsed.origin
}

export function getKindRobotsBaseUrl() {
  const config = useRuntimeConfig()
  return normalizeBaseUrl(config.kindRobotsBaseUrl)
}

export function resolveKindRobotsUrl(path: string) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('..')) {
    throw new Error('Kind Robots BFF paths must be absolute application paths')
  }

  return new URL(path, `${getKindRobotsBaseUrl()}/`).toString()
}

export async function kindRobotsGet<T>(path: string) {
  return $fetch<T>(resolveKindRobotsUrl(path), {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })
}
