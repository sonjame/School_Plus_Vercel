'use client'

import React, { useState, useEffect } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'

interface UserData {
  id: number
  username: string
  password?: string
  school: string
  grade: string
  entryYear: number
  classNum?: number | null
  name?: string
  pw?: string
  userPassword?: string
  eduCode?: string
  schoolCode?: string
  profileImageUrl?: string | null
}

/** 🔥 학교 검색 결과 row 타입 지정 */
interface SchoolRow {
  SCHUL_NM: string
  SD_SCHUL_CODE: string
  ATPT_OFCDC_SC_CODE: string
  LCTN_SC_NM?: string
  [key: string]: unknown
}

const getPwInputStyle = (darkMode: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: darkMode ? '1px solid #334155' : '1px solid #d1d5db',
  background: darkMode ? '#0f172a' : 'white',
  color: darkMode ? '#e2e8f0' : '#111827',
  fontSize: 13,
  boxSizing: 'border-box',
})

function Field({
  label,
  value,
  darkMode,
}: {
  label: string
  value: string
  darkMode: boolean
}) {
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
          color: darkMode ? '#e2e8f0' : '#374151',
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
          border: darkMode ? '1px solid #334155' : '1px solid #e5e7eb',
          background: darkMode ? '#0f172a' : '#f3f4f6',
          color: darkMode ? '#e2e8f0' : '#6b7280',
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

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768)
    }

    check()
    window.addEventListener('resize', check)

    return () => window.removeEventListener('resize', check)
  }, [])

  // 🔐 재로그인 안내 모달
  const [showReloginModal, setShowReloginModal] = useState(false)
  const [reloginReason, setReloginReason] = useState<
    'password' | 'school' | 'class' | null
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

  const [showClassForm, setShowClassForm] = useState(false)
  const [classInput, setClassInput] = useState('')

  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // 🔥 회원탈퇴 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletePw, setDeletePw] = useState('')

  // 🔹 프로필 미리보기 모달
  const [showProfileModal, setShowProfileModal] = useState(false)

  const [profileHistory, setProfileHistory] = useState<
    { id: number; image_url: string; created_at: string }[]
  >([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  // 🔹 이전 프로필 불러오기
  const loadProfileHistory = async () => {
    if (!user) return

    const res = await apiFetch(`/api/user/profile-history?userId=${user.id}`)
    const data = await res.json()
    setProfileHistory(data)
  }

  // 회원탈퇴 완료 모달 디자인
  const [showDeleteDoneModal, setShowDeleteDoneModal] = useState(false)

  // 🔔 알림 설정
  type NotificationSettings = {
    chat: boolean
    postComment: boolean
    commentReply: boolean
  }

  type ThemeSettings = {
    darkMode: boolean
  }

  const getThemeSetting = (userId: number): ThemeSettings => {
    const raw = localStorage.getItem(`theme_settings_${userId}`)
    if (!raw) return { darkMode: false }
    return JSON.parse(raw)
  }

  const saveThemeSetting = (userId: number, settings: ThemeSettings) => {
    localStorage.setItem(`theme_settings_${userId}`, JSON.stringify(settings))
  }
  const [themeSetting, setThemeSetting] = useState<ThemeSettings>({
    darkMode: false,
  })

  useEffect(() => {
    if (!user) return
    const settings = getThemeSetting(user.id)
    setThemeSetting(settings)
  }, [user])
  const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    chat: true,
    postComment: true,
    commentReply: true,
  }

  const getNotificationSettings = (userId: number) => {
    const raw = localStorage.getItem(`notification_settings_${userId}`)
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS
    return JSON.parse(raw)
  }

  const saveNotificationSettings = (
    userId: number,
    settings: NotificationSettings,
  ) => {
    localStorage.setItem(
      `notification_settings_${userId}`,
      JSON.stringify(settings),
    )
  }

  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)

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
        id: parsed.id,
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
        classNum: parsed.classNum ?? null,
        profileImageUrl: parsed.profileImageUrl || '/default-profile.svg',
      }

      setUser(normalized)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const settings = getNotificationSettings(user.id)
    setNotificationSettings(settings)
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

    if (!user) {
      alert('사용자 정보가 없습니다.')
      return
    }

    const res = await apiFetch('/api/user/change-password', {
      method: 'POST',
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

    const res = await apiFetch('/api/user/change-school', {
      method: 'POST',
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
      level: data.level,
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

    // ✅
    const res = await apiFetch('/api/user/delete', {
      method: 'POST',
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
    localStorage.removeItem('class_num')

    setShowDeleteModal(false)
    setShowDeleteDoneModal(true)
  }

  const handleClassSave = async () => {
    if (!user) return

    const res = await apiFetch('/api/user/change-class', {
      method: 'POST',
      body: JSON.stringify({
        username: user.username,
        classNum: classInput ? Number(classInput) : null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert(data.message || '반 저장 중 오류가 발생했습니다.')
      return
    }

    // ✅ React state 업데이트
    const updatedUser = {
      ...user,
      classNum: data.classNum,
    }

    setUser(updatedUser)

    // 🔥 user 전체 기준으로 저장 (profileImageUrl 유지)
    const prev = JSON.parse(localStorage.getItem('loggedInUser') || '{}')

    localStorage.setItem(
      'loggedInUser',
      JSON.stringify({
        ...prev,
        ...updatedUser, // ← 핵심
        token: prev.token,
      }),
    )

    // UI 정리
    setShowClassForm(false)
    setClassInput('')

    // 🔐 반 변경 후 재로그인 요구
    setReloginReason('class')
    setShowReloginModal(true)
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
        background: themeSetting.darkMode ? '#0f172a' : '#f8fafc',
        color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: themeSetting.darkMode ? '#1e293b' : 'white',
          borderRadius: 16,
          padding: 24,
          boxShadow: themeSetting.darkMode
            ? '0 10px 30px rgba(0,0,0,0.4)'
            : '0 10px 30px rgba(15,23,42,0.12)',
        }}
      >
        {/* 🔹 프로필 사진 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={user.profileImageUrl || '/default-profile.svg'}
              alt="profile"
              onClick={() => setShowProfileModal(true)}
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #e5e7eb',
                cursor: 'pointer',
              }}
            />
            {/* 🔍 프로필 이미지 미리보기 모달 */}
            {showProfileModal && user && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10000,
                }}
                onClick={() => setShowProfileModal(false)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                    borderRadius: 16,
                    padding: 24,
                    width: '90%',
                    maxWidth: 360,
                    textAlign: 'center',
                  }}
                >
                  {/* 큰 프로필 이미지 */}
                  <img
                    src={user.profileImageUrl || '/default-profile.svg'}
                    alt="profile-large"
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #e5e7eb',
                      marginBottom: 16,
                    }}
                  />

                  {/* 버튼 영역 */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      justifyContent: 'center',
                    }}
                  >
                    {/* 사진 변경 */}
                    <label
                      style={{
                        padding: '8px 14px',
                        background: '#4FC3F7',
                        color: 'white',
                        borderRadius: 999,
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      사진 변경
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return

                          const formData = new FormData()
                          formData.append('file', file)

                          const uploadRes = await fetch('/api/upload/profile', {
                            method: 'POST',
                            body: formData,
                          })
                          const { url } = await uploadRes.json()

                          // ✅
                          await apiFetch('/api/user/change-profile-image', {
                            method: 'POST',
                            body: JSON.stringify({
                              userId: user.id,
                              profileImageUrl: url,
                            }),
                          })

                          const updatedUser = { ...user, profileImageUrl: url }
                          setUser(updatedUser)

                          const prev = JSON.parse(
                            localStorage.getItem('loggedInUser') || '{}',
                          )
                          localStorage.setItem(
                            'loggedInUser',
                            JSON.stringify({
                              ...prev,
                              profileImageUrl: url,
                              token: prev.token,
                            }),
                          )

                          setShowProfileModal(false)
                        }}
                      />
                    </label>

                    {/* 기본 이미지로 */}
                    <button
                      onClick={async () => {
                        const defaultUrl = '/default-profile.svg'

                        await apiFetch('/api/user/change-profile-image', {
                          method: 'POST',
                          body: JSON.stringify({
                            userId: user.id,
                            profileImageUrl: defaultUrl,
                          }),
                        })

                        const updatedUser = {
                          ...user,
                          profileImageUrl: defaultUrl,
                        }
                        setUser(updatedUser)

                        const prev = JSON.parse(
                          localStorage.getItem('loggedInUser') || '{}',
                        )
                        localStorage.setItem(
                          'loggedInUser',
                          JSON.stringify({
                            ...prev,
                            profileImageUrl: defaultUrl,
                            token: prev.token,
                          }),
                        )

                        setShowProfileModal(false)
                      }}
                      style={{
                        padding: '8px 14px',
                        background: '#e5e7eb',
                        borderRadius: 999,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      기본 이미지
                    </button>

                    <button
                      onClick={async () => {
                        await loadProfileHistory()
                        setShowHistoryModal(true)
                      }}
                      style={{
                        padding: '8px 14px',
                        background: '#f1f5f9',
                        borderRadius: 999,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      이전 프로필
                    </button>
                  </div>

                  <button
                    onClick={() => setShowProfileModal(false)}
                    style={{
                      marginTop: 14,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 13,
                      color: '#6b7280',
                      cursor: 'pointer',
                    }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            )}

            <label
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: '#4FC3F7',
                color: 'white',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ✎
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !user) return

                  const formData = new FormData()
                  formData.append('file', file)

                  // 1️⃣ 이미지 업로드
                  const uploadRes = await fetch('/api/upload/profile', {
                    method: 'POST',
                    body: formData,
                  })
                  const { url } = await uploadRes.json()

                  // 2️⃣ DB 저장
                  const res = await apiFetch('/api/user/change-profile-image', {
                    method: 'POST',
                    body: JSON.stringify({
                      userId: user.id,
                      profileImageUrl: url,
                    }),
                  })

                  const data = await res.json()

                  // 3️⃣ 상태 + localStorage 반영
                  const updatedUser = {
                    ...user,
                    profileImageUrl: data.profileImageUrl,
                  }
                  setUser(updatedUser)

                  const prev = JSON.parse(
                    localStorage.getItem('loggedInUser') || '{}',
                  )

                  localStorage.setItem(
                    'loggedInUser',
                    JSON.stringify({
                      ...prev,
                      profileImageUrl: data.profileImageUrl,
                      token: prev.token,
                    }),
                  )
                }}
              />
            </label>
          </div>
        </div>

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

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <button
            onClick={() => setShowNotificationModal(true)}
            style={{
              background: 'transparent',
              border: themeSetting.darkMode
                ? '1px solid #334155'
                : '1px solid #e5e7eb',
              color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
              padding: '6px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ⚙ 설정
          </button>
        </div>
        <Field
          label="이름"
          value={user.name || ''}
          darkMode={themeSetting.darkMode}
        />

        <Field
          label="아이디"
          value={user.username}
          darkMode={themeSetting.darkMode}
        />

        <Field
          label="학년"
          value={getCurrentGrade(user.entryYear)}
          darkMode={themeSetting.darkMode}
        />

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
              width: isMobile ? '90%' : '85%',
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
                background: themeSetting.darkMode ? '#0f172a' : '#f3f4f6',
                border: themeSetting.darkMode
                  ? '1px solid #334155'
                  : '1px solid #e5e7eb',
                color: themeSetting.darkMode ? '#e2e8f0' : '#374151',
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
                width: isMobile ? '90%' : '85%', // 📌 input과 동일 비율
                margin: '6px auto 0',
                borderRadius: 10,
                background: themeSetting.darkMode ? '#0f172a' : '#f9fafb',
                border: themeSetting.darkMode
                  ? '1px solid #334155'
                  : '1px solid #e5e7eb',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                  border: themeSetting.darkMode
                    ? '1px solid #334155'
                    : '1px solid #d1d5db',
                  background: themeSetting.darkMode ? '#0f172a' : 'white',
                  color: themeSetting.darkMode ? '#e2e8f0' : '#111827',
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
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                          borderBottom: themeSetting.darkMode
                            ? '1px solid #334155'
                            : '1px solid #f3f4f6',

                          color: themeSetting.darkMode ? '#f1f5f9' : '#111827', // ⭐ 핵심
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

        <Field
          label="학년"
          value={getCurrentGrade(user.entryYear)}
          darkMode={themeSetting.darkMode}
        />

        {/* 🔹 반 정보 */}
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
            반
          </label>

          <div
            style={{
              width: isMobile ? '90%' : '85%',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <input
              value={user.classNum ? `${user.classNum}반` : '미입력'}
              readOnly
              disabled
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: themeSetting.darkMode
                  ? '1px solid #334155'
                  : '1px solid #e5e7eb',
                background: themeSetting.darkMode ? '#0f172a' : '#f3f4f6',
                color: themeSetting.darkMode
                  ? '#e2e8f0'
                  : user.classNum
                    ? '#374151'
                    : '#9ca3af',
                cursor: 'not-allowed',
              }}
            />

            <button
              type="button"
              onClick={() => setShowClassForm((prev) => !prev)}
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
              반 수정
            </button>
          </div>
        </div>

        {showClassForm && (
          <div
            style={{
              width: '85%',
              margin: '6px auto 0',
              padding: '10px',
              borderRadius: 10,
              border: themeSetting.darkMode
                ? '1px solid #334155'
                : '1px solid #e5e7eb',
              background: themeSetting.darkMode ? '#0f172a' : '#f9fafb',
            }}
          >
            <input
              type="text"
              placeholder="반 입력 (숫자만, 예: 3)"
              value={classInput}
              onChange={(e) =>
                setClassInput(e.target.value.replace(/[^0-9]/g, ''))
              }
              style={getPwInputStyle(themeSetting.darkMode)}
            />

            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
              반을 모르면 비워두셔도 됩니다.
            </p>

            <button
              type="button"
              onClick={handleClassSave}
              style={{
                marginTop: 8,
                width: '100%',
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
              저장
            </button>
          </div>
        )}

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
                border: themeSetting.darkMode
                  ? '1px solid #334155'
                  : '1px solid #e5e7eb',
                background: themeSetting.darkMode ? '#0f172a' : '#f9fafb',
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
                style={getPwInputStyle(themeSetting.darkMode)}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="새 비밀번호"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  style={{
                    ...getPwInputStyle(themeSetting.darkMode),
                    paddingRight: 40,
                  }}
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
                  style={{
                    ...getPwInputStyle(themeSetting.darkMode),
                    paddingRight: 40,
                  }}
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
                background: themeSetting.darkMode ? '#1e293b' : 'white',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                background: themeSetting.darkMode ? '#1e293b' : 'white',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                borderRadius: 12,
                padding: 20,
                width: '80%',
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
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                background: themeSetting.darkMode ? '#1e293b' : 'white',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                borderRadius: 12,
                padding: 20,
                width: '80%',
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
                탈퇴 시 개인정보는 즉시 삭제되며, 사용자가 작성한 게시글 및
                댓글은 서비스 기록으로 남습니다. 동일한 계정 정보로는 탈퇴 후
                30일이 지나야 재가입할 수 있습니다.
              </p>

              <input
                type="password"
                placeholder="비밀번호 입력"
                value={deletePw}
                onChange={(e) => setDeletePw(e.target.value)}
                style={getPwInputStyle(themeSetting.darkMode)}
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
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
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
                background: themeSetting.darkMode ? '#1e293b' : 'white',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                borderRadius: 12,
                padding: 22,
                width: '80%',
                maxWidth: 360,
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                {reloginReason === 'password'
                  ? '비밀번호가 변경되었습니다.'
                  : reloginReason === 'school'
                    ? '학교 정보가 변경되었습니다.'
                    : '반 정보가 변경되었습니다.'}{' '}
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

        {showHistoryModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10001,
            }}
            onClick={() => setShowHistoryModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: themeSetting.darkMode ? '#1e293b' : 'white',
                color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                borderRadius: 16,
                padding: 20,
                width: '90%',
                maxWidth: 420,
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                이전 프로필
              </h3>

              {profileHistory.length === 0 && (
                <p style={{ fontSize: 13, color: '#6b7280' }}>
                  이전 프로필이 없습니다.
                </p>
              )}

              {profileHistory.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 10,
                    borderRadius: 12,
                    border: themeSetting.darkMode
                      ? '1px solid #334155'
                      : '1px solid #e5e7eb',
                    marginBottom: 10,
                  }}
                >
                  <img
                    src={p.image_url}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(p.created_at).toLocaleString()}
                    </div>

                    <button
                      onClick={async () => {
                        await apiFetch('/api/user/change-profile-image', {
                          method: 'POST',
                          body: JSON.stringify({
                            userId: user.id,
                            profileImageUrl: p.image_url,
                          }),
                        })

                        const updatedUser = {
                          ...user,
                          profileImageUrl: p.image_url,
                        }
                        setUser(updatedUser)

                        const prev = JSON.parse(
                          localStorage.getItem('loggedInUser') || '{}',
                        )

                        localStorage.setItem(
                          'loggedInUser',
                          JSON.stringify({
                            ...prev,
                            profileImageUrl: p.image_url,
                            token: prev.token,
                          }),
                        )

                        setShowHistoryModal(false)
                        setShowProfileModal(false)
                      }}
                      style={{
                        marginTop: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: 'none',
                        background: '#4FC3F7',
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      이 프로필로 변경
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm('이 프로필 이미지를 삭제할까요?')) return

                        const res = await apiFetch(
                          '/api/user/delete-profile-image',
                          {
                            method: 'POST',
                            body: JSON.stringify({
                              profileImageId: p.id,
                            }),
                          },
                        )

                        const result = await res.json()

                        // 🔥🔥🔥 여기 추가해야 함
                        if (result.currentProfileReset) {
                          const defaultUrl = '/default-profile.svg'

                          // ✅ React state 갱신
                          setUser((prev) =>
                            prev
                              ? { ...prev, profileImageUrl: defaultUrl }
                              : prev,
                          )

                          // ✅ localStorage 갱신 (토큰 유지!)
                          const prevLS = JSON.parse(
                            localStorage.getItem('loggedInUser') || '{}',
                          )

                          localStorage.setItem(
                            'loggedInUser',
                            JSON.stringify({
                              ...prevLS,
                              profileImageUrl: defaultUrl,
                              token: prevLS.token,
                            }),
                          )
                        }

                        // 🔄 목록 다시 불러오기
                        await loadProfileHistory()
                      }}
                      style={{
                        marginTop: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: 'none',
                        background: '#ef4444',
                        color: 'white',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setShowHistoryModal(false)}
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '8px 0',
                  borderRadius: 999,
                  border: 'none',
                  background: '#e5e7eb',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>

      {showNotificationModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: themeSetting.darkMode ? '#1e293b' : 'white',
              color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 360,
            }}
          >
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔔 알림 설정</h3>

            {[
              { key: 'chat', label: '채팅 알림' },
              { key: 'postComment', label: '내 게시글 댓글 알림' },
              { key: 'commentReply', label: '내 댓글 답글 알림' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span>{item.label}</span>

                <div
                  onClick={() => {
                    const key = item.key as keyof NotificationSettings
                    const updated = {
                      ...notificationSettings,
                      [key]: !notificationSettings[key],
                    }
                    setNotificationSettings(updated)
                    if (!user) return
                    saveNotificationSettings(user.id, updated)
                  }}
                  style={{
                    width: 60,
                    height: 26,
                    borderRadius: 999,
                    background: notificationSettings[
                      item.key as keyof NotificationSettings
                    ]
                      ? '#4FC3F7'
                      : '#e5e7eb',
                    position: 'relative',
                    cursor: 'pointer',

                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 6px',
                    boxSizing: 'border-box',
                    fontSize: 10,
                    fontWeight: 700,
                    color: notificationSettings[
                      item.key as keyof NotificationSettings
                    ]
                      ? 'white'
                      : '#6b7280',
                    justifyContent: notificationSettings[
                      item.key as keyof NotificationSettings
                    ]
                      ? 'flex-start'
                      : 'flex-end',
                  }}
                >
                  {notificationSettings[item.key as keyof NotificationSettings]
                    ? 'ON'
                    : 'OFF'}

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: themeSetting.darkMode ? '#1e293b' : 'white',
                      color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                      position: 'absolute',
                      top: 2,
                      left: notificationSettings[
                        item.key as keyof NotificationSettings
                      ]
                        ? 34
                        : 2,

                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <span>🌙 다크모드</span>

              <div
                onClick={() => {
                  const updated = {
                    darkMode: !themeSetting.darkMode,
                  }

                  setThemeSetting(updated)
                  if (!user) return
                  saveThemeSetting(user.id, updated)

                  // 🔥 RootLayout에 알려주기
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                      new CustomEvent('theme-change', { detail: updated }),
                    )
                  }

                  // (선택) documentElement에 dark 클래스도 유지하고 싶으면 그대로
                  if (updated.darkMode) {
                    document.documentElement.classList.add('dark')
                  } else {
                    document.documentElement.classList.remove('dark')
                  }
                }}
                style={{
                  width: 60,
                  height: 26,
                  borderRadius: 999,
                  background: themeSetting.darkMode ? '#4FC3F7' : '#e5e7eb',
                  position: 'relative',
                  cursor: 'pointer',

                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 6px',
                  boxSizing: 'border-box',
                  fontSize: 10,
                  fontWeight: 700,
                  color: themeSetting.darkMode ? 'white' : '#6b7280',
                  justifyContent: themeSetting.darkMode
                    ? 'flex-start'
                    : 'flex-end',
                }}
              >
                {themeSetting.darkMode ? 'ON' : 'OFF'}

                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: themeSetting.darkMode ? '#1e293b' : 'white',
                    color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
                    position: 'absolute',
                    top: 2,
                    left: themeSetting.darkMode ? 34 : 2,

                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowNotificationModal(false)}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px 0',
                borderRadius: 999,
                border: 'none',
                background: '#4FC3F7',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {showDeleteDoneModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              background: themeSetting.darkMode ? '#1e293b' : 'white',
              color: themeSetting.darkMode ? '#f1f5f9' : '#111827',
              borderRadius: 16,
              padding: '28px 24px',
              width: '90%',
              maxWidth: 360,
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              animation: 'fadeIn 0.25s ease-out',
            }}
          >
            {/* 아이콘 */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#E0F2FE',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontWeight: 700,
                margin: '0 auto 12px',
              }}
            >
              ✓
            </div>

            {/* 제목 */}
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              회원탈퇴가 완료되었습니다
            </h3>

            {/* 설명 */}
            <p
              style={{
                fontSize: 13,
                color: '#6b7280',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              개인정보는 안전하게 삭제되었습니다.
              <br />
              이용해주셔서 감사합니다.
            </p>

            {/* 버튼 */}
            <button
              onClick={() => {
                // 로컬 정리
                localStorage.clear()
                window.location.href = '/auth/login'
              }}
              style={{
                width: '100%',
                padding: '10px 0',
                borderRadius: 999,
                border: 'none',
                background: '#4FC3F7',
                color: 'white',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              로그인 페이지로 이동
            </button>
          </div>

          {/* 애니메이션 */}
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.92);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </main>
  )
}
