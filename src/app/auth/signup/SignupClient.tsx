'use client'

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

const API_KEY = '32cbd596f1b64e7abc94e1eb85ca5a06'

export default function SignupPage() {
  const searchParams = useSearchParams()

  // ⭐ 입력 값
  const [verified, setVerified] = useState(false)

  const [realName, setRealName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [school, setSchool] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [eduCode, setEduCode] = useState('')
  const [level, setLevel] = useState('')
  const [grade, setGrade] = useState('1학년')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [showConfirm, setShowConfirm] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  // ⭐ 아이디 중복체크 관련
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null)

  const [verifiedEmail, setVerifiedEmail] = useState('')

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      setVerifiedEmail(email)
    }
  }, [searchParams])

  // 🔐 비밀번호 검증 함수 (여기에 추가)
  const validatePassword = (pw: string) => {
    const minLength = pw.length >= 6
    const hasLetter = /[a-zA-Z]/.test(pw)
    const hasNumber = /[0-9]/.test(pw)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pw)

    return {
      valid: minLength && hasLetter && hasNumber && hasSpecial,
      minLength,
      hasLetter,
      hasNumber,
      hasSpecial,
    }
  }

  // 🔐 아이디 검증 함수
  const validateUsername = (id: string) => {
    const regex = /^(?=.*[a-z])(?=.*[0-9])[a-z0-9]{5,20}$/
    return regex.test(id)
  }

  // 🔎 비밀번호 조건 체크 결과
  const passwordCheck = validatePassword(password)

  // 🔎 아이디 조건 체크 결과
  const usernameCheck = {
    length: username.length >= 5,
    hasLetter: /[a-z]/.test(username),
    hasNumber: /[0-9]/.test(username),
    valid: validateUsername(username),
  }

  // 소셜 정보 로드
  useEffect(() => {
    const socialName = searchParams.get('name')
    const socialEmail = searchParams.get('social_email')

    const socialId = searchParams.get('id') || searchParams.get('social_id')

    if (socialName && socialId) {
      localStorage.setItem(
        'socialUser',
        JSON.stringify({
          id: socialId,
          name: socialName,
          email: socialEmail || null, // 이메일 없어도 OK
        }),
      )
    }
  }, [searchParams])

  // 인증 여부 확인
  useEffect(() => {
    // 🔴 이미 가입된 경우 → 회원가입 로직 타면 안 됨
    if (searchParams.get('already') === '1') return

    const verifiedParam = searchParams.get('verified')
    const provider = searchParams.get('provider')

    if (verifiedParam === '1' || provider === 'kakao') {
      setVerified(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('already') === '1') {
      setModalMessage('이미 카카오로 가입된 계정입니다.\n로그인해주세요.')
      setShowModal(true)

      // 1.5초 뒤 로그인 페이지로 이동
      setTimeout(() => {
        setShowModal(false)
        window.location.href = '/auth/login'
      }, 1500)
    }
  }, [searchParams])

  // 공통 alert
  const showAlert = (msg: string) => {
    setModalMessage(msg)
    setShowModal(true)
    setTimeout(() => setShowModal(false), 1500)
  }

  // 인증
  const handleKakaoAuth = () =>
    (window.location.href = '/api/auth/kakao?mode=signup')

  const handleGoogleAuth = () => (window.location.href = '/api/auth/google')
  const handleEmailAuth = () => {
    localStorage.removeItem('socialUser') // 🔥 핵심
    window.location.href = '/auth/email'
  }

  // ⭐ 학교 검색
  const searchSchool = async (keyword: string) => {
    setSchool(keyword)
    setIsSearching(true)

    if (keyword.trim().length < 2) {
      setSearchResults([])
      return
    }

    try {
      const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(
        keyword,
      )}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.schoolInfo && data.schoolInfo[1]?.row) {
        setSearchResults(data.schoolInfo[1].row)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const selectSchool = (item: any) => {
    setSchool(item.SCHUL_NM)
    setSchoolCode(item.SD_SCHUL_CODE)
    setEduCode(item.ATPT_OFCDC_SC_CODE)
    setLevel(item.SCHUL_KND_SC_NM)
    setSearchResults([])
    setIsSearching(false)
  }

  // ⭐ 아이디 중복확인
  const checkDuplicateId = async () => {
    if (!username.trim()) {
      showAlert('아이디를 입력해주세요.')
      return
    }

    try {
      const res = await fetch(`/api/auth/check-id?username=${username}`)

      if (!res.ok) {
        showAlert('아이디 중복 확인 중 서버 오류가 발생했습니다.')
        return
      }

      const text = await res.text()
      if (!text) {
        showAlert('서버 응답이 없습니다.')
        return
      }

      const data = JSON.parse(text)

      if (data.available) {
        setIdAvailable(true)
        showAlert('사용 가능한 아이디입니다!')
      } else {
        setIdAvailable(false)
        showAlert('이미 사용 중인 아이디입니다.')
      }
    } catch (err) {
      console.error(err)
      showAlert('아이디 중복 확인 중 오류가 발생했습니다.')
    }
  }

  // 제출 전 체크
  const handleSubmit = () => {
    if (!realName || !username || !school) {
      showAlert('모든 정보를 입력해주세요.')
      return
    }

    // 🔥 여기 추가
    if (!validateUsername(username)) {
      showAlert(
        '아이디는 5~20자의 영문 소문자와 숫자를 섞어서 입력해야 합니다.',
      )
      return
    }

    if (!verified) {
      showAlert('이메일 또는 소셜 인증을 먼저 해주세요.')
      return
    }

    // ⭐ 아이디 중복확인 여부 체크
    if (idAvailable === false) {
      showAlert('이미 사용 중인 아이디입니다.')
      return
    }

    if (idAvailable !== true) {
      showAlert('아이디 중복확인을 먼저 해주세요.')
      return
    }

    if (password !== password2) {
      showAlert('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!passwordCheck.valid) {
      showAlert('비밀번호는 6자 이상, 영문/숫자/특수문자를 포함해야 합니다.')
      return
    }

    setShowConfirm(true)
  }

  const handleFinalSubmit = async () => {
    const social = JSON.parse(localStorage.getItem('socialUser') || '{}')

    const body = {
      username,
      password,
      name: realName,
      email: verifiedEmail || null,
      social_id: social.id || null, // ⭐⭐⭐ 이 줄 추가 (핵심)
      school,
      schoolCode,
      eduCode,
      level,
      grade,
    }

    // 🔑 일반 회원만 비밀번호 포함
    if (!social.id) {
      body.password = password
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      showAlert('회원가입 완료!')
      localStorage.removeItem('socialUser')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 1500)
    } else {
      const err = await res.json()
      console.error(err)
      showAlert(err.message || '회원가입 실패')
    }
  }

  // 스타일
  const cardStyle: React.CSSProperties = {
    width: '420px',
    background: 'white',
    borderRadius: '16px',
    padding: '40px 30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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

  const KakaoIcon = ({ size = 22 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3C6.477 3 2 6.373 2 10.534c0 2.675 1.91 5.033 4.82 6.38l-1.05 3.91c-.1.38.33.68.67.47l4.56-3.05c.33.03.67.05 1 .05 5.523 0 10-3.373 10-7.536C22 6.373 17.523 3 12 3z"
        fill="#3C1E1E"
      />
    </svg>
  )

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
        {/* STEP 1: 인증 */}
        {!verified && (
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#4FC3F7',
                marginBottom: '6px',
              }}
            >
              🔐 본인 인증
            </h2>
            <p
              style={{ fontSize: '14px', color: '#555', marginBottom: '20px' }}
            >
              회원가입을 위해 하나를 선택해주세요.
            </p>

            <button onClick={handleKakaoAuth} className="auth-btn kakao">
              <KakaoIcon size={22} />
              카카오로 계속하기
            </button>

            <button onClick={handleGoogleAuth} className="auth-btn google">
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="google"
                width={22}
                height={22}
                className="auth-icon"
              />
              Google로 계속하기
            </button>

            <button onClick={handleEmailAuth} className="auth-btn email">
              📧 이메일 인증
            </button>
          </div>
        )}

        {/* STEP 2: 회원가입 입력 */}
        {verified && (
          <div style={cardStyle}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#4FC3F7',
                textAlign: 'center',
                marginBottom: '10px',
              }}
            >
              📝 회원가입
            </h2>

            {verifiedEmail && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#2E7D32',
                  marginBottom: '10px',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                📧 인증된 이메일: {verifiedEmail}
              </p>
            )}

            {/* 실명 */}
            <input
              style={inputStyle}
              placeholder="이름을 입력하세요 (실명)"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />

            {/* 아이디 + 중복확인 버튼 */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
              <input
                style={{ ...inputStyle, paddingRight: '100px' }}
                placeholder="아이디를 입력하세요"
                value={username}
                onChange={(e) => {
                  const value = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '')
                  setUsername(value)
                  setIdAvailable(null) // 아이디 바뀌면 중복확인 무효
                }}
              />

              <p
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '4px',
                }}
              >
                ※ 아이디는 <strong>영문 소문자(a–z)</strong>와{' '}
                <strong>숫자(0–9)</strong>만 입력할 수 있습니다.
              </p>

              <button
                onClick={checkDuplicateId}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '35%',
                  transform: 'translateY(-50%)',
                  padding: '8px 10px',
                  background: '#4FC3F7',
                  color: 'white',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                중복확인
              </button>
            </div>

            {/* 🔐 아이디 조건 안내 */}
            {username.length > 0 && (
              <ul
                style={{
                  fontSize: '12px',
                  marginTop: '6px',
                  paddingLeft: '18px',
                }}
              >
                <li
                  style={{
                    color: usernameCheck.length ? '#2E7D32' : '#D32F2F',
                  }}
                >
                  5자 이상
                </li>
                <li
                  style={{
                    color: usernameCheck.hasLetter ? '#2E7D32' : '#D32F2F',
                  }}
                >
                  영문/숫자 포함
                </li>
              </ul>
            )}

            {/* ✅ 아이디 조건 만족 메시지 */}
            {username.length > 0 && usernameCheck.valid && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#2E7D32',
                  fontWeight: 600,
                }}
              >
                ✅ 아이디 조건을 만족합니다.
              </p>
            )}

            {/* 중복확인 결과 */}
            {idAvailable === true && (
              <p
                style={{ color: '#2E7D32', fontSize: '13px', marginTop: '6px' }}
              >
                ✅ 사용 가능한 아이디입니다.
              </p>
            )}

            {idAvailable === false && (
              <p
                style={{ color: '#D32F2F', fontSize: '13px', marginTop: '6px' }}
              >
                ❌ 이미 사용 중인 아이디입니다.
              </p>
            )}

            {/* 비밀번호 */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
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
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </span>
            </div>

            {/* 🔐 비밀번호 조건 안내 */}
            {password.length > 0 && (
              <ul
                style={{
                  fontSize: '12px',
                  marginTop: '6px',
                  paddingLeft: '18px',
                }}
              >
                <li
                  style={{
                    color: passwordCheck.minLength ? '#2E7D32' : '#D32F2F',
                  }}
                >
                  6자 이상
                </li>
                <li
                  style={{
                    color: passwordCheck.hasLetter ? '#2E7D32' : '#D32F2F',
                  }}
                >
                  영문/숫자 포함
                </li>
                <li
                  style={{
                    color: passwordCheck.hasSpecial ? '#2E7D32' : '#D32F2F',
                  }}
                >
                  {'특수문자 포함(!@#$%^&*(),.?":{}|<>)'}
                </li>
              </ul>
            )}

            {/* ✅ 비밀번호 조건 만족 메시지 */}
            {password.length > 0 && passwordCheck.valid && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#2E7D32',
                  fontWeight: 600,
                }}
              >
                ✅ 비밀번호 조건을 만족합니다.
              </p>
            )}

            <input
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              style={{ ...inputStyle, marginTop: '12px' }}
            />

            {/* 학교 검색 */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
              <input
                style={inputStyle}
                placeholder="학교명을 입력하세요 (자동완성)"
                value={school}
                onChange={(e) => searchSchool(e.target.value)}
              />

              {isSearching && searchResults.length > 0 && (
                <ul
                  style={{
                    position: 'absolute',
                    top: '50px',
                    width: '100%',
                    background: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    zIndex: 100,
                  }}
                >
                  {searchResults.map((item) => (
                    <li
                      key={item.SD_SCHUL_CODE}
                      onClick={() => selectSchool(item)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                      }}
                    >
                      <strong>{item.SCHUL_NM}</strong>
                      <span style={{ color: '#777', marginLeft: '6px' }}>
                        ({item.LCTN_SC_NM})
                      </span>
                      <span style={{ color: '#4FC3F7', marginLeft: '6px' }}>
                        / {item.SCHUL_KND_SC_NM}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <select
              style={{ ...inputStyle, marginTop: '12px' }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option>1학년</option>
              <option>2학년</option>
              <option>3학년</option>
            </select>

            <p style={{ fontSize: '13px', color: '#d32f2f', marginTop: '6px' }}>
              ⚠️ 한번 선택한 학년은 변경할 수 없습니다.
            </p>

            <button
              onClick={handleSubmit}
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
                marginTop: '20px',
              }}
            >
              회원가입 완료
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: '20px',
                fontSize: '14px',
              }}
            >
              이미 계정이 있으신가요?
              <Link
                href="/auth/login"
                style={{ color: '#4FC3F7', fontWeight: 600 }}
              >
                {' '}
                로그인
              </Link>
            </p>

            {/* 학년 확인 모달 */}
            {showConfirm && (
              <div className="confirm-backdrop">
                <div className="confirm-box">
                  <div className="confirm-icon">❗</div>
                  <p className="confirm-text">{grade} 이 맞습니까?</p>
                  <div className="confirm-buttons">
                    <button
                      className="cancel-btn"
                      onClick={() => setShowConfirm(false)}
                    >
                      취소
                    </button>
                    <button className="ok-btn" onClick={handleFinalSubmit}>
                      확인
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 알림 모달 */}
        {showModal && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <div className="modal-icon">✔</div>
              <p>{modalMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* 일부 스타일 유지 */}
      <style jsx>{`
        .auth-btn {
          width: 100%;
          height: 48px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          margin-bottom: 12px;
          justify-content: flex-start;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .auth-icon {
          width: 22px;
          height: 22px;
          margin-right: 12px;
        }

        .google {
          background: #ffffff;
          border: 1px solid #ddd;
          color: #444;
        }

        .kakao {
          background: #fee500;
          color: #3c1e1e;
        }

        .email {
          background: #e3f2fd;
          border: 1px solid #90caf9;
          color: #1976d2;
        }

        .modal-backdrop,
        .confirm-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(3px);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modal-box,
        .confirm-box {
          background: white;
          padding: 30px;
          border-radius: 16px;
          text-align: center;
          border: 2px solid #4fc3f7;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .cancel-btn,
        .ok-btn {
          flex: 1;
          height: 42px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
        }

        .cancel-btn {
          background: #e2e2e2;
          color: #333;
        }

        .ok-btn {
          background: #4fc3f7;
          color: white;
        }
      `}</style>
    </>
  )
}
