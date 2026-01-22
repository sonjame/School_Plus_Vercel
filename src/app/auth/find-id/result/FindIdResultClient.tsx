'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function FindIdResultClient() {
  const searchParams = useSearchParams()
  const socialId = searchParams.get('social_id')

  const [username, setUsername] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!socialId) return

    fetch(`/api/auth/find-id/kakao?social_id=${socialId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.username) setUsername(data.username)
        else setError(data.message)
      })
  }, [socialId])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#E3F2FD',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 420,
          background: 'white',
          padding: 40,
          borderRadius: 20,
          textAlign: 'center',
        }}
      >
        <h2 style={{ color: '#4FC3F7' }}>🟡 카카오 아이디 찾기</h2>

        {username ? (
          <p style={{ marginTop: 20, fontSize: 18 }}>
            가입된 아이디는 <b>{username}</b> 입니다
          </p>
        ) : (
          <p style={{ marginTop: 20, color: '#d32f2f' }}>
            {error || '조회 중...'}
          </p>
        )}

        <a
          href="/auth/login"
          style={{
            display: 'block',
            marginTop: 30,
            background: '#4FC3F7',
            color: 'white',
            padding: 12,
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          로그인 하러 가기
        </a>
      </div>
    </div>
  )
}
