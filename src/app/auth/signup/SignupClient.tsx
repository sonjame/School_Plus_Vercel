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
  const [grade, setGrade] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [showConfirm, setShowConfirm] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  const [signupLoading, setSignupLoading] = useState(false)

  const [class_num, setClassNum] = useState('') // 반 (예: 3반)

  // ⭐ 아이디 중복체크 관련
  const [idAvailable, setIdAvailable] = useState<boolean | null>(null)

  const [verifiedEmail, setVerifiedEmail] = useState('')

  // 🔐 관리자 승인 필요 여부
  const [needAdminApproval, setNeedAdminApproval] = useState(false)

  const approved = searchParams.get('approved')

  // 🔐 모달 타입 (추가)
  const [modalType, setModalType] = useState<
    'WAIT' | 'NEED_ADMIN_APPROVAL' | null
  >(null)

  useEffect(() => {
    const email = searchParams.get('email')
    if (email) {
      setVerifiedEmail(email)
    }
  }, [searchParams])

  useEffect(() => {
    if (approved === '1') {
      if (typeof window === 'undefined') return // ✅ 이 줄 추가

      if (sessionStorage.getItem('rejoinApprovedShown')) return

      sessionStorage.setItem('rejoinApprovedShown', '1')

      setModalMessage(
        '✅ 해당 계정은\n관리자에 의해 재가입 승인이 완료되었습니다.\n\n이제 회원가입을 진행할 수 있습니다.',
      )
      setModalType(null)
      setShowModal(true)
    }
  }, [approved])

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

  const validateRealName = (name: string) => {
    return /^[가-힣]{2,4}$/.test(name)
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
      const provider =
        searchParams.get('provider') ||
        (searchParams.get('id') ? 'google' : null)

      localStorage.setItem(
        'socialUser',
        JSON.stringify({
          id: socialId,
          name: socialName,
          email: socialEmail || null,
          provider, // 🔥 핵심
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
    setModalType(null)
    setShowModal(true)
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

    setGrade('') // ✅ 학교 변경 시 학년 초기화

    setSearchResults([])
    setIsSearching(false)
  }

  // ⭐ 아이디 중복확인
  const checkDuplicateId = async () => {
    if (!username.trim()) {
      showAlert('아이디를 입력해주세요.')
      return
    }

    // ✅ 아이디 형식 먼저 검사
    if (!validateUsername(username)) {
      setIdAvailable(null)

      setModalMessage(
        '아이디는 5~20자의 영문 소문자와 숫자를 섞어서 입력해야 합니다.',
      )

      setModalType(null)
      setShowModal(true)

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
    if (!realName && !username) {
      showAlert('이름과 아이디를 입력해주세요.')
      return
    }

    if (!realName) {
      showAlert('이름을 입력해주세요.')
      return
    }

    if (!username) {
      showAlert('아이디를 입력해주세요.')
      return
    }

    if (!school || !grade) {
      showAlert('학교와 학년을 입력해주세요.')
      return
    }
    if (!validateRealName(realName)) {
      showAlert('이름은 한글 2~4자로 입력해주세요. 초성만 입력할 수 없습니다.')
      return
    }

    if (!schoolCode || !eduCode || !level) {
      showAlert('학교 검색 결과에서 학교를 선택해주세요.')
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
    // 🔒 중복 클릭 방지
    if (signupLoading) return

    setSignupLoading(true)

    try {
      const social = JSON.parse(localStorage.getItem('socialUser') || '{}')

      let provider: 'email' | 'kakao' | 'google' = 'email'

      if (social?.id && social.provider) {
        provider = social.provider
      }

      const body = {
        username,
        password,
        name: realName,
        email: verifiedEmail || null,
        provider,
        social_id: social.id || null,
        school,
        schoolCode,
        eduCode,
        level,
        grade,
        class_num: class_num ? Number(class_num) : null,
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
        try {
          const err = await res.json()

          if (err.status === 'WAIT') {
            const formattedDate = new Date(
              err.rejoinAvailableAt,
            ).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })

            setModalMessage(
              `탈퇴 후 30일 이내에는 재가입할 수 없습니다.\n\n재가입 가능일:\n${formattedDate}`,
            )

            setModalType('WAIT')
            setShowModal(true)
            return
          }

          if (err.status === 'NEED_ADMIN_APPROVAL') {
            setModalMessage(
              '이 계정은 탈퇴 이력이 있어\n관리자 승인이 필요합니다.',
            )

            setModalType('NEED_ADMIN_APPROVAL')
            setShowModal(true)
            return
          }

          showAlert(err.message || '회원가입 실패')
        } catch {
          showAlert('회원가입 실패')
        }
      }
    } finally {
      // 🔓 다시 활성화
      setSignupLoading(false)
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
              placeholder="한글 이름 2~4자 입력"
              value={realName}
              maxLength={4}
              onChange={(e) => {
                setRealName(e.target.value.slice(0, 4))
              }}
              onBlur={() => {
                setRealName((prev) =>
                  prev
                    .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, '')
                    .replace(/[^가-힣]/g, '')
                    .slice(0, 4),
                )
              }}
            />

            {realName.length > 0 && !validateRealName(realName) && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#D32F2F',
                  fontWeight: 600,
                }}
              >
                ❌ 이름은 한글 2~4자만 입력 가능합니다.
              </p>
            )}

            {realName.length > 0 && validateRealName(realName) && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#2E7D32',
                  fontWeight: 600,
                }}
              >
                ✅ 올바른 이름 형식입니다.
              </p>
            )}

            {/* 아이디 + 중복확인 버튼 */}
            <div style={{ marginTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="아이디를 입력하세요"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, '')
                    setUsername(value)
                    setIdAvailable(null)
                  }}
                />

                <button
                  onClick={checkDuplicateId}
                  style={{
                    padding: '10px 12px',
                    background: '#4FC3F7',
                    color: 'white',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  중복확인
                </button>
              </div>

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
                onChange={(e) => {
                  setPassword(e.target.value)
                  setPassword2('') // ✅ 비밀번호 바뀌면 확인 입력 초기화
                }}
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

            {/* ❌ 비밀번호 조건 불만족 */}
            {password.length > 0 && !passwordCheck.valid && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#D32F2F',
                  fontWeight: 600,
                }}
              >
                ❌ 비밀번호 조건에 만족하지 않습니다. 다시 입력해주세요.
              </p>
            )}

            <input
              type="password"
              placeholder={
                password.length > 0 && !passwordCheck.valid
                  ? '비밀번호 조건을 만족하세요'
                  : '비밀번호를 다시 입력하세요'
              }
              value={password2}
              disabled={password.length === 0 || !passwordCheck.valid}
              onChange={(e) => setPassword2(e.target.value)}
              style={{
                ...inputStyle,
                marginTop: '12px',
                background:
                  password.length === 0 || !passwordCheck.valid
                    ? '#f3f4f6'
                    : 'white',
                cursor:
                  password.length === 0 || !passwordCheck.valid
                    ? 'not-allowed'
                    : 'text',
              }}
            />

            {password2.length > 0 && password !== password2 && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#D32F2F',
                  fontWeight: 600,
                }}
              >
                ❌ 비밀번호가 일치하지 않습니다.
              </p>
            )}

            {password2.length > 0 && password === password2 && (
              <p
                style={{
                  fontSize: '13px',
                  marginTop: '6px',
                  color: '#2E7D32',
                  fontWeight: 600,
                }}
              >
                ✅ 비밀번호가 일치합니다.
              </p>
            )}

            {/* 학교 검색 */}
            <div style={{ position: 'relative', marginTop: '12px' }}>
              <input
                style={inputStyle}
                placeholder="학교명을 입력하세요 (자동완성)"
                value={school}
                onChange={(e) => {
                  setSchoolCode('')
                  setEduCode('')
                  setLevel('')
                  setGrade('')
                  searchSchool(e.target.value)
                }}
              />

              <p
                style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}
              >
                ℹ️ 검색 결과에서 학교를 반드시 선택해야 가입할 수 있습니다.
              </p>

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

              {isSearching &&
                school.trim().length >= 2 &&
                searchResults.length === 0 && (
                  <p
                    style={{
                      color: '#D32F2F',
                      fontSize: '13px',
                      marginTop: '8px',
                      fontWeight: 600,
                    }}
                  >
                    ❌ 검색 결과가 나오지 않습니다.
                  </p>
                )}
            </div>

            <select
              style={{ ...inputStyle, marginTop: '12px' }}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">학년을 선택하세요</option>

              {/* 중학교 */}
              {level.includes('중학교') && (
                <>
                  <option>예비 중학생</option>
                  <option>1학년</option>
                  <option>2학년</option>
                  <option>3학년</option>
                </>
              )}

              {/* 고등학교 */}
              {level.includes('고등학교') && (
                <>
                  <option>예비 고등학생</option>
                  <option>1학년</option>
                  <option>2학년</option>
                  <option>3학년</option>
                </>
              )}
            </select>

            <p style={{ fontSize: '13px', color: '#d32f2f', marginTop: '6px' }}>
              ⚠️ 한번 선택한 학년은 변경할 수 없습니다.
            </p>

            <input
              type="number"
              inputMode="numeric"
              style={{ ...inputStyle, marginTop: '12px' }}
              placeholder="반 번호 입력 (숫자만, 예: 3)"
              value={class_num}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '')
                setClassNum(value)
              }}
            />

            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              ℹ️ 반을 모르면 비워두셔도 됩니다. 나중에 내 정보에서 수정할 수
              있어요.
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

            {/* 🔐 관리자 승인 요청 영역 */}
            {needAdminApproval && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#FFF3E0',
                  border: '1px solid #FFB74D',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                  ⚠️ 이 계정은 탈퇴 이력이 있어
                  <br />
                  <strong>관리자 승인 후 재가입</strong>이 가능합니다.
                </p>

                <Link
                  href="/support/rejoin-request"
                  style={{
                    display: 'inline-block',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#FF9800',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  관리자 승인 요청하기
                </Link>
              </div>
            )}

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
                    <button
                      className="ok-btn"
                      onClick={handleFinalSubmit}
                      disabled={signupLoading}
                      style={{
                        opacity: signupLoading ? 0.6 : 1,
                        cursor: signupLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {signupLoading ? '가입 중...' : '확인'}
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
              <div className="modal-icon">⚠️</div>

              <p
                style={{
                  whiteSpace: 'pre-line',
                  fontSize: '17px',
                  fontWeight: 600,
                  lineHeight: 1.6,
                }}
              >
                {modalMessage}
              </p>

              {/* ⏳ 30일 대기 */}
              {modalType === 'WAIT' && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '16px',
                  }}
                >
                  {/* 취소 버튼 */}
                  <button
                    className="cancel-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowModal(false)
                      setModalType(null)
                    }}
                  >
                    취소
                  </button>

                  {/* 확인 버튼 */}
                  <button
                    className="ok-btn"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setShowModal(false)
                      setModalType(null)
                    }}
                  >
                    관리자 요청하기
                  </button>
                </div>
              )}

              {/* 🛡 관리자 승인 필요 */}
              {modalType === 'NEED_ADMIN_APPROVAL' && (
                <div
                  style={{ display: 'flex', gap: '10px', marginTop: '16px' }}
                >
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowModal(false)
                      setModalType(null)
                    }}
                  >
                    취소
                  </button>

                  <button
                    className="ok-btn"
                    onClick={() => {
                      window.location.href = '/support/rejoin-request'
                    }}
                  >
                    관리자 승인 요청하기
                  </button>
                </div>
              )}

              {/* ✅ 승인 완료 (approved=1) */}
              {modalType === null && (
                <button
                  className="ok-btn"
                  style={{ marginTop: '16px', width: '100%' }}
                  onClick={() => {
                    setShowModal(false)
                  }}
                >
                  확인
                </button>
              )}
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
