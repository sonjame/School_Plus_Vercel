'use client'

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken')

  let res = await fetch(url, {
    ...options,
    credentials: 'include', // 🔥 refresh 쿠키 필수
    headers: {
      ...(options.headers || {}),
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
    },
  })

  if (res.status !== 401) return res

  // 🔄 refresh 시도
  const refreshRes = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })

  if (!refreshRes.ok) {
    localStorage.removeItem('accessToken')
    window.location.href = '/auth/login' // ⚠️ 실제 로그인 경로
    throw new Error('REFRESH_FAILED')
  }

  // ✅ 헤더에서 accessToken 받기 (🔥 핵심)
  const newAccessToken = refreshRes.headers.get('x-access-token')
  if (!newAccessToken) {
    throw new Error('NO_NEW_ACCESS_TOKEN')
  }

  localStorage.setItem('accessToken', newAccessToken)

  // 🔁 원래 요청 재시도
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${newAccessToken}`,
    },
  })
}
