'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function FindPasswordPage() {
  const [method, setMethod] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (error && error === 'not-match') {
      setErrorMessage('카카오 계정과 입력한 아이디가 일치하지 않습니다.')
    }
  }, [error])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1.5px solid #d0d7e2',
    fontSize: '15px',
    boxSizing: 'border-box',
    marginTop: '14px',
  }

  const findPassword = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    if (!method) return alert('가입 방식을 선택하세요.')

    if (method === 'kakao') {
      if (!username) {
        alert('아이디를 입력하세요.')
        return
      }

      try {
        const checkRes = await fetch('/api/auth/find-password/kakao-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })

        if (!checkRes.ok) {
          let message = '카카오로 가입한 아이디가 아닙니다. 다시 입력해주세요.'

          try {
            const data = await checkRes.json()
            if (data?.message) message = data.message
          } catch {
            // JSON 파싱 실패 시 기본 메시지 사용
          }

          alert(message)
          return
        }
      } catch (err) {
        console.error(err)
        alert('서버와 통신 중 오류가 발생했습니다.')
        return
      }

      // ✅ 여기까지 왔으면 카카오 가입자 → OAuth 이동
      const kakaoAuthUrl =
        `https://kauth.kakao.com/oauth/authorize` +
        `?client_id=${process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID}` +
        `&redirect_uri=${process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI}` +
        `&response_type=code` +
        `&state=find-password:${username}`

      window.location.href = kakaoAuthUrl
      return
    }

    // ✅ 이메일 / 구글 공통 처리
    if (!username || !email) {
      alert('아이디와 이메일을 모두 입력하세요.')
      return
    }

    const res = await fetch('/api/auth/find-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email }),
    })

    let data: any = {}
    try {
      data = await res.json()
    } catch {
      alert('서버 오류가 발생했습니다.')
      return
    }

    if (!res.ok) {
      alert(data.message)
      return
    }

    setMessage(data.message)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#E3F2FD',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 420,
          background: 'white',
          padding: '40px 30px',
          borderRadius: 20,
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        }}
      >
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#4FC3F7',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          🔐 비밀번호 찾기
        </h2>

        {errorMessage && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: '#FFEBEE',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
              color: '#C62828',
              border: '1px solid #EF9A9A',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* 가입 방식 선택 */}
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={inputStyle}
        >
          <option value="">가입 방식을 선택하세요</option>
          <option value="email">📧 이메일로 가입</option>
          <option value="google">🔵 구글로 가입</option>
          <option value="kakao">🟡 카카오로 가입</option>
        </select>

        {/* 이메일/구글/카카오 공통 아이디 입력 */}
        {method && (
          <input
            type="text"
            placeholder="아이디를 입력하세요"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        )}

        {/* 이메일/구글만 이메일 입력 */}
        {(method === 'email' || method === 'google') && (
          <input
            type="email"
            placeholder="가입한 이메일을 입력하세요"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        )}

        {method && (
          <button
            type="button"
            onClick={(e) => findPassword(e)}
            style={{
              width: '100%',
              marginTop: 20,
              padding: 14,
              background: '#4FC3F7',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {method === 'kakao' ? '카카오로 본인 인증' : '임시 비밀번호 발급'}
          </button>
        )}

        {method === 'kakao' && (
          <div
            style={{
              marginTop: 12,
              padding: 14,
              background: '#FFF9C4',
              borderRadius: 12,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            📌 카카오 회원은 이메일로 비밀번호를 재설정할 수 없습니다.
            <br />
            카카오 인증 후 새 비밀번호를 설정해주세요.
          </div>
        )}

        {/* 결과 메시지 */}
        {message && (
          <>
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: '#E3F2FD',
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid #bcdcff',
                fontWeight: 600,
              }}
            >
              {message}
              <br />
              로그인 후 비밀번호를 꼭 변경하세요.
            </div>

            {/* 로그인 하러 가기 버튼 */}
            <button
              onClick={() => (window.location.href = '/auth/login')}
              style={{
                width: '100%',
                marginTop: 16,
                padding: 14,
                background: '#4FC3F7',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔐 로그인 하러 가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}
