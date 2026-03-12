'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  // ⭐ Enter 키로 로그인 실행
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        login()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const inputWrapper: React.CSSProperties = {
    width: '100%',
    position: 'relative',
    marginBottom: '16px',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1.5px solid #ccc',
    fontSize: '15px',
    outlineColor: '#4FC3F7',
    boxSizing: 'border-box',
  }

  const showAlert = (msg: string, callback?: () => void) => {
    setModalMessage(msg)
    setShowModal(true)
    setTimeout(() => {
      setShowModal(false)
      if (callback) callback()
    }, 1500)
  }

  const login = async () => {
    if (!username || !password) {
      showAlert('아이디와 비밀번호를 입력해주세요.')
      return
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
    })

    let data: any = {}
    try {
      data = await res.json()
    } catch {
      data = {}
    }

    if (!res.ok) {
      showAlert(data.message || '아이디 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    // ✅ 로그인 성공
    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        ...data.user,
        token: data.accessToken, // ⭐⭐⭐ 핵심
      }),
    )

    // accessToken 따로 쓰고 싶으면 유지해도 됨 (선택)
    localStorage.setItem('accessToken', data.accessToken)

    localStorage.setItem('userId', data.user.id.toString())
    localStorage.setItem('userSchool', data.user.school)

    localStorage.setItem('level', data.user.level)

    localStorage.setItem(
      'userGrade',
      'grade' + String(data.user.grade).replace('학년', ''),
    )

    if (data.user.eduCode) localStorage.setItem('eduCode', data.user.eduCode)
    if (data.user.schoolCode)
      localStorage.setItem('schoolCode', data.user.schoolCode)

    showAlert('로그인 성공!', () => {
      if (data.user.level === 'admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/'
      }
    })
  }

  return (
    <>
      <div
        style={{
          minHeight: '100vh',
          background: '#E3F2FD',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            width: '420px',
            background: 'white',
            borderRadius: '16px',
            padding: '40px 30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#4FC3F7',
              textAlign: 'center',
              marginBottom: '10px',
            }}
          >
            🔐 로그인
          </h2>

          <p
            style={{ textAlign: 'center', marginBottom: '25px', color: '#666' }}
          >
            학교 커뮤니티에 오신 것을 환영합니다!
          </p>

          <div style={inputWrapper}>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={inputWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, paddingRight: '48px' }}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: 'pointer',
                color: '#4FC3F7',
                fontSize: '16px',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          <button
            onClick={login}
            style={{
              width: '100%',
              background: '#4FC3F7',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            로그인
          </button>

          <p
            style={{
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '14px',
            }}
          >
            계정이 없으신가요?{' '}
            <Link
              href="/auth/signup"
              style={{ color: '#4FC3F7', fontWeight: 600 }}
            >
              회원가입
            </Link>
          </p>
          <p
            style={{
              textAlign: 'center',
              marginTop: '14px',
              fontSize: '14px',
            }}
          >
            <Link
              href="/auth/find-id"
              style={{ color: '#4FC3F7', fontWeight: 600 }}
            >
              아이디 찾기
            </Link>
            {'  /  '}
            <Link
              href="/auth/find-password"
              style={{ color: '#4FC3F7', fontWeight: 600 }}
            >
              비밀번호 찾기
            </Link>
          </p>
        </div>
      </div>

      {/* ⭐ 모달 UI */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div className="modal-icon">✔</div>
            <p>{modalMessage}</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .modal-box {
          background: #ffffff;
          padding: 32px 36px;
          border-radius: 14px;
          border: 2px solid #4fc3f7;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          text-align: center;

          width: 90%;
          max-width: 150px; /* ⭐ PC에서 적당한 크기 */
          min-width: 100px;

          animation: fadeIn 0.25s ease-out;
        }

        .modal-icon {
          color: #4fc3f7;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 6px;
        }
      `}</style>
    </>
  )
}
