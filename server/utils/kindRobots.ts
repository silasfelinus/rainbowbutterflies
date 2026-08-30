function normalizeBaseUrl(value: string) {
  const parsed = new URL(value)
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'

  if (parsed.username || parsed.password || parsed.hash || parsed.search) {
    throw new Error('KIND_ROBOTS_BASE_URL must be a clean origin')
  }

  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) {
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

export async function kindRobotsGet<T>(path: string): Promise<T> {
  return await $fetch<T>(resolveKindRobotsUrl(path), {
    method: 'GET',
    headers: {
      accept: 'application/json',
    },
  })
}

export async function kindRobotsPost<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  return await $fetch<T>(resolveKindRobotsUrl(path), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body,
  })
}
