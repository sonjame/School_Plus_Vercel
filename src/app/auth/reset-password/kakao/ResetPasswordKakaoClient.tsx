'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function KakaoResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const username = searchParams.get('username')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordRules = {
    length: newPassword.length >= 6,
    letter: /[A-Za-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[@$!%*?&^#~()_+\-={}[\]|\\:;"'<>,./]/.test(newPassword),
  }

  const isValidPassword =
    passwordRules.length &&
    passwordRules.letter &&
    passwordRules.number &&
    passwordRules.special

  if (!username) {
    router.replace('/auth/find-password')
    return null
  }

  const resetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert('비밀번호를 모두 입력하세요.')
      return
    }

    if (!isValidPassword) {
      alert('비밀번호 조건을 모두 만족해야 합니다.')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/password-reset/kakao/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.message || '비밀번호 변경 실패')
        return
      }

      alert('비밀번호가 성공적으로 변경되었습니다.')
      router.replace('/auth/login')
    } catch (err) {
      console.error(err)
      alert('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1.5px solid #d0d7e2',
    fontSize: '15px',
    boxSizing: 'border-box',
    marginTop: '14px',
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
            color: '#FEE500',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          🟡 카카오 비밀번호 재설정
        </h2>

        {/* 새 비밀번호 */}
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="새 비밀번호"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-25%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: '#666',
            }}
          >
            {showPassword ? '숨김' : '보기'}
          </button>
        </div>

        <ul style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
          <li style={{ color: passwordRules.length ? 'green' : 'red' }}>
            {passwordRules.length ? '✔' : '✖'} 6자 이상
          </li>
          <li style={{ color: passwordRules.letter ? 'green' : 'red' }}>
            {passwordRules.letter ? '✔' : '✖'} 영문/숫자 포함
          </li>
          <li style={{ color: passwordRules.special ? 'green' : 'red' }}>
            {passwordRules.special ? '✔' : '✖'} 특수문자 포함
          </li>
        </ul>

        {/* 비밀번호 확인 */}
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />

        <button
          onClick={resetPassword}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 24,
            padding: 14,
            background: '#FEE500',
            color: '#3A1D1D',
            border: 'none',
            borderRadius: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {loading ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </div>
  )
}
