'use client'

import React, { useState, useEffect } from 'react'

interface UserData {
  username: string
  password?: string
  school: string
  grade: string
  entryYear: number
  name?: string
  pw?: string
  userPassword?: string
  eduCode?: string
  schoolCode?: string
}

/** 🔥 학교 검색 결과 row 타입 지정 */
interface SchoolRow {
  SCHUL_NM: string
  SD_SCHUL_CODE: string
  ATPT_OFCDC_SC_CODE: string
  LCTN_SC_NM?: string
  [key: string]: unknown
}

const pwInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 13,
  boxSizing: 'border-box',
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        marginBottom: 18,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <label
        style={{
          marginBottom: 6,
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          width: '80%',
        }}
      >
        {label}
      </label>

      <input
        value={value}
        readOnly
        disabled
        style={{
          width: '80%',
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid #e5e7eb',
          background: '#f3f4f6',
          color: '#6b7280',
          cursor: 'not-allowed',
        }}
      />
    </div>
  )
}

export default function MyInfoPagePreview() {
  const [user, setUser] = useState<UserData | null>(null)

  const [showPwForm, setShowPwForm] = useState(false)
  const [showPwConfirmModal, setShowPwConfirmModal] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')

  // 🔐 재로그인 안내 모달
  const [showReloginModal, setShowReloginModal] = useState(false)
  const [reloginReason, setReloginReason] = useState<
    'password' | 'school' | null
  >(null)

  // 🔥 강제 로그아웃 함수
  const forceLogout = () => {
    localStorage.removeItem('loggedInUser')
    localStorage.removeItem('eduCode')
    localStorage.removeItem('schoolCode')
    localStorage.removeItem('school')

    window.location.href = '/auth/login'
  }

  // 🎓 현재 학년 계산
  const getCurrentGrade = (entryYear: number) => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    // 한국 기준: 3월에 학년 올라감
    const academicYear = month >= 3 ? year : year - 1

    const grade = academicYear - entryYear + 1

    if (grade < 1) return '입학 전'
    if (grade > 3) return '졸업'

    return `${grade}학년`
  }

  // 🔐 비밀번호 검증 함수 (회원가입과 동일)
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

  // 🔎 새 비밀번호 조건 체크 결과
  const passwordCheck = validatePassword(newPw)

  const [showNewPw, setShowNewPw] = useState(false)

  const [showSchoolForm, setShowSchoolForm] = useState(false)
  const [schoolKeyword, setSchoolKeyword] = useState('')

  const [searchResults, setSearchResults] = useState<SchoolRow[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [schoolMessage, setSchoolMessage] = useState<string | null>(null)
  const [schoolError, setSchoolError] = useState<string | null>(null)

  const [selectedSchool, setSelectedSchool] = useState<string | null>(null)
  const [selectedSchoolRow, setSelectedSchoolRow] = useState<SchoolRow | null>(
    null,
  )

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // 🔥 회원탈퇴 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)

      const extractEntryYear = (grade: string) => {
        const match = grade.match(/\d+/)
        if (!match) return new Date().getFullYear()
        const gradeNumber = Number(match[0])
        const currentYear = new Date().getFullYear()
        return currentYear - (gradeNumber - 1)
      }

      const normalized: UserData = {
        username: parsed.username,
        school: parsed.school,
        grade: parsed.grade,
        entryYear: parsed.entryYear ?? extractEntryYear(parsed.grade),
        name: parsed.name,
        eduCode: parsed.eduCode,
        schoolCode: parsed.schoolCode,
        password:
          parsed.password ?? parsed.pw ?? parsed.userPassword ?? undefined,
        pw: parsed.pw,
        userPassword: parsed.userPassword,
      }

      setUser(normalized)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    const prev = JSON.parse(localStorage.getItem('loggedInUser') || '{}')

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        ...prev, // 🔥 기존 token 유지
        ...user,
        token: prev.token, // 🔥 핵심
      }),
    )
  }, [user])

  const handlePasswordChange = async () => {
    if (!currentPw || !newPw || !newPw2) {
      alert('모든 비밀번호를 입력해주세요.')
      return
    }

    if (!passwordCheck.valid) {
      alert('비밀번호는 6자 이상이며 영문, 숫자, 특수문자를 포함해야 합니다.')
      return
    }

    if (newPw !== newPw2) {
      alert('새 비밀번호가 서로 다릅니다.')
      return
    }

    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        currentPw,
        newPw,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    setShowPwForm(false)
    setShowPwConfirmModal(false)

    setReloginReason('password')
    setShowReloginModal(true)
  }

  /** 🔹 학교 검색 */
  const handleSchoolSearch = async (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) {
      setSchoolError(null)
      setSearchResults([])
      setSelectedSchool(null)
      return
    }

    setIsSearching(true)
    setSchoolMessage(null)
    setSchoolError(null)

    try {
      const API_KEY = process.env.NEXT_PUBLIC_NEIS_KEY
      if (!API_KEY) {
        setSchoolError('서버 설정 오류로 학교 검색을 할 수 없습니다.')
        return
      }

      const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&pIndex=1&pSize=20&SCHUL_NM=${encodeURIComponent(
        trimmed,
      )}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.schoolInfo && data.schoolInfo[1]?.row) {
        const rows: SchoolRow[] = data.schoolInfo[1].row

        const filtered = rows.filter((s) =>
          String(s.SCHUL_NM || '').includes(trimmed),
        )

        setSearchResults(filtered)
        if (!filtered.length) setSchoolError('검색 결과가 없습니다.')
      } else {
        setSchoolError('검색 결과가 없습니다.')
      }
    } catch {
      setSchoolError('학교 검색 중 오류 발생.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectSchool = (schoolRow: SchoolRow) => {
    setSelectedSchool(schoolRow.SCHUL_NM)
    setSelectedSchoolRow(schoolRow)
    setSchoolMessage(
      `'${schoolRow.SCHUL_NM}'(으)로 변경하려면 아래 확인을 누르세요.`,
    )
  }

  const handleConfirmSchoolChange = async () => {
    if (!user || !selectedSchoolRow) return

    const res = await fetch('/api/user/change-school', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        school: selectedSchoolRow.SCHUL_NM,
        eduCode: selectedSchoolRow.ATPT_OFCDC_SC_CODE,
        schoolCode: selectedSchoolRow.SD_SCHUL_CODE,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    const updatedUser = {
      ...user,
      school: data.school,
      eduCode: data.eduCode,
      schoolCode: data.schoolCode,
    }

    // 🔥 기존 loggedInUser 가져오기
    const prev = JSON.parse(localStorage.getItem('loggedInUser') || '{}')

    setUser(updatedUser)

    // 🔥 token 절대 유지
    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        ...prev,
        ...updatedUser,
        token: prev.token,
      }),
    )

    setShowConfirmModal(false)
    setShowSchoolForm(false)

    setReloginReason('school')
    setShowReloginModal(true)
  }

  const handleCancelSchoolChange = () => setShowConfirmModal(false)

  const handleDeleteAccount = async () => {
    if (!user) return

    if (!deletePw) {
      alert('비밀번호를 입력해주세요.')
      return
    }

    const res = await fetch('/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        password: deletePw,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message)
      return
    }

    // ✅ 로컬 정보 제거
    localStorage.removeItem('loggedInUser')
    localStorage.removeItem('eduCode')
    localStorage.removeItem('schoolCode')
    localStorage.removeItem('school')

    alert('회원탈퇴가 완료되었습니다.')

    // 로그인 페이지로 이동
    window.location.href = '/auth/login'
  }

  if (!user) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <p>로그인이 필요합니다.</p>
      </main>
    )
  }

  return (
    <main
      style={{
        minHeight: '85vh',
        display: 'flex',
        justifyContent: 'center',
        padding: '70px 40px 30px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 4,
            textAlign: 'center',
          }}
        >
          내 정보
        </h1>

        <Field label="이름" value={user.name || ''} />
        <Field label="아이디" value={user.username} />

        {/* 🔹 학교 변경 UI */}
        <div style={{ marginBottom: 18, width: '100%', textAlign: 'center' }}>
          <label
            style={{
              marginBottom: 6,
              fontSize: 13,
              fontWeight: 600,
              display: 'block',
              width: '80%',
              margin: '0 auto 6px',
              textAlign: 'left',
            }}
          >
            학교 이름
          </label>

          {/* 기존 필드 디자인과 동일한 배치 */}
          <div
            style={{
              width: '85%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <input
              value={user.school}
              readOnly
              disabled
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#f3f4f6',
                cursor: 'not-allowed',
              }}
            />

            <button
              type="button"
              onClick={() => {
                setSchoolMessage(null)
                setSchoolError(null)
                setShowSchoolForm((prev) => !prev)
                setSearchResults([])
                setSchoolKeyword('')
                setSelectedSchool(null)
                setShowConfirmModal(false)
              }}
              style={{
                padding: '8px 12px',
                background: '#38bdf8',
                color: 'white',
                borderRadius: 10,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              학교 변경
            </button>
          </div>

          {/* 🔹 검색창 & 결과 카드 */}
          {showSchoolForm && (
            <div
              style={{
                width: '85%', // 📌 input과 동일 비율
                margin: '6px auto 0',
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                padding: '8px 10px', // 📌 padding 줄여서 input에 딱 맞게
                boxSizing: 'border-box',
              }}
            >
              {/* 검색 input — width 줄임 */}
              <input
                type="text"
                placeholder="학교 이름을 입력하세요"
                value={schoolKeyword}
                onChange={(e) => {
                  setSchoolKeyword(e.target.value)
                  handleSchoolSearch(e.target.value)
                }}
                style={{
                  width: '90%', // 📌 컨테이너와 동일하게
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  fontSize: 13,
                  outline: 'none',
                }}
              />

              {isSearching && (
                <p
                  style={{
                    fontSize: 12,
                    textAlign: 'center',
                    color: '#6b7280',
                  }}
                >
                  🔎 검색 중...
                </p>
              )}

              {/* 검색결과 박스 */}
              {searchResults.length > 0 && (
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: 'auto',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    marginTop: 6,
                  }}
                >
                  {searchResults.map((s) => {
                    const isSelected = selectedSchool === s.SCHUL_NM
                    return (
                      <button
                        key={s.SD_SCHUL_CODE}
                        type="button"
                        onClick={() => handleSelectSchool(s)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          border: 'none',
                          background: isSelected ? '#e0f2fe' : 'transparent',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {s.SCHUL_NM}
                        </div>
                        {s.LCTN_SC_NM && (
                          <div
                            style={{
                              fontSize: 11,
                              color: '#6b7280',
                            }}
                          >
                            {s.LCTN_SC_NM}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {schoolError && (
                <p style={{ fontSize: 12, color: 'red', marginTop: 4 }}>
                  {schoolError}
                </p>
              )}

              {selectedSchool && (
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    padding: '8px 0',
                    borderRadius: 8,
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✔ 선택한 학교 적용
                </button>
              )}
            </div>
          )}

          {schoolMessage && (
            <p
              style={{
                marginTop: 6,
                fontSize: 12,
                color: schoolMessage.includes('변경') ? '#10b981' : '#6b7280',
              }}
            >
              {schoolMessage}
            </p>
          )}
        </div>

        <Field label="학년" value={getCurrentGrade(user.entryYear)} />

        {/* 비밀번호 변경 */}
        <div style={{ marginTop: 30, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setShowPwForm((prev) => !prev)
              if (!showPwForm) {
                setCurrentPw('')
                setNewPw('')
                setNewPw2('')
              }
            }}
            style={{
              padding: '10px 16px',
              background: '#4FC3F7',
              color: 'white',
              borderRadius: 10,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            비밀번호 변경
          </button>

          {showPwForm && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setShowPwConfirmModal(true)
              }}
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <input
                type="password"
                placeholder="현재 비밀번호"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                style={pwInputStyle}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="새 비밀번호"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={{ ...pwInputStyle, paddingRight: 40 }}
                />

                {/* 🔐 비밀번호 조건 안내 (회원가입과 동일) */}
                {newPw.length > 0 && (
                  <ul style={{ fontSize: 12, paddingLeft: 18 }}>
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
                      특수문자 포함 (!@#$%^&*)
                    </li>
                  </ul>
                )}

                {newPw.length > 0 && passwordCheck.valid && (
                  <p
                    style={{
                      fontSize: 13,
                      color: '#2E7D32',
                      fontWeight: 600,
                    }}
                  >
                    ✅ 비밀번호 조건을 만족합니다.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewPw((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: '#6366f1',
                    fontWeight: 600,
                  }}
                >
                  {showNewPw ? '숨김' : '보기'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="새 비밀번호 확인"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  style={{ ...pwInputStyle, paddingRight: 40 }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: 4,
                  padding: '9px 12px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </form>
          )}
        </div>

        {/* 🔥 회원탈퇴 버튼 */}
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            style={{
              padding: '10px 30px',
              background: '#ef4444',
              color: 'white',
              borderRadius: 10,
              border: 'none',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            회원탈퇴
          </button>
        </div>

        {/* 비번 변경 모달 */}
        {showPwConfirmModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                width: '90%',
                maxWidth: 360,
              }}
            >
              <p style={{ textAlign: 'center', marginBottom: 16 }}>
                비밀번호를 변경하시겠습니까?
              </p>
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 8 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowPwConfirmModal(false)
                    handlePasswordChange()
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  예
                </button>
                <button
                  type="button"
                  onClick={() => setShowPwConfirmModal(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  아니오
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 학교 변경 확인 모달 */}
        {showConfirmModal && selectedSchool && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                width: '90%',
                maxWidth: 360,
              }}
            >
              <p style={{ textAlign: 'center', marginBottom: 16 }}>
                정말 학교를 변경하시겠습니까?
              </p>
              <div
                style={{ display: 'flex', justifyContent: 'center', gap: 10 }}
              >
                <button
                  type="button"
                  onClick={handleConfirmSchoolChange}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#6366f1',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  예
                </button>
                <button
                  type="button"
                  onClick={handleCancelSchoolChange}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  아니오
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 회원탈퇴 확인 모달 */}
        {showDeleteModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                width: '90%',
                maxWidth: 360,
              }}
            >
              <p style={{ textAlign: 'center', marginBottom: 12 }}>
                정말 회원탈퇴를 진행하시겠습니까?
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#ef4444',
                  textAlign: 'center',
                  marginBottom: 10,
                }}
              >
                탈퇴 시 모든 정보는 삭제되며 복구할 수 없습니다.
              </p>

              <input
                type="password"
                placeholder="비밀번호 입력"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                style={pwInputStyle}
              />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  탈퇴
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletePw('')
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 999,
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {showReloginModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 22,
                width: '90%',
                maxWidth: 360,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                {reloginReason === 'password'
                  ? '비밀번호가 변경되었습니다.'
                  : '학교 정보가 변경되었습니다.'}
              </p>

              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 18 }}>
                보안을 위해 로그아웃됩니다.
                <br />
                다시 로그인해주세요.
              </p>

              <button
                type="button"
                onClick={forceLogout}
                style={{
                  padding: '9px 20px',
                  borderRadius: 999,
                  border: 'none',
                  background: '#6366f1',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
