'use client'

let isRefreshing = false
let waitQueue: ((token: string) => void)[] = []

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const isBrowser = typeof window !== 'undefined'

  const accessToken = isBrowser ? localStorage.getItem('accessToken') : null

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  })

  // ✅ 서버에서는 refresh 시도 자체를 하지 않음
  if (!isBrowser || res.status !== 401) {
    return res
  }

  // 🔒 refresh 중이면 대기
  if (isRefreshing) {
    return new Promise((resolve) => {
      waitQueue.push((newToken) => {
        resolve(
          fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${newToken}`,
            },
          }),
        )
      })
    })
  }

  isRefreshing = true

  try {
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshRes.ok) {
      // ❗ 브라우저에서만 실행
      localStorage.removeItem('accessToken')
      window.location.href = '/auth/login'
      throw new Error('REFRESH_FAILED')
    }

    const { accessToken: newAccessToken } = await refreshRes.json()
    if (!newAccessToken) throw new Error('NO_NEW_ACCESS_TOKEN')

    localStorage.setItem('accessToken', newAccessToken)

    // 🔔 대기 중이던 요청들 재개
    waitQueue.forEach((cb) => cb(newAccessToken))
    waitQueue = []

    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${newAccessToken}`,
      },
    })
  } finally {
    isRefreshing = false
  }
}
