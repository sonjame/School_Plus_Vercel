'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ToastProvider } from '@/src/context/ToastContext'
import { useRef } from 'react'
import { useToast } from '@/src/context/ToastContext'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [isPC, setIsPC] = useState<boolean>(true)
  const [banRemainMs, setBanRemainMs] = useState<number | null>(null)

  const [darkMode, setDarkMode] = useState(false)

  const effectiveDark = user?.level === 'admin' ? false : darkMode

  useEffect(() => {
    const restoreLogin = async () => {
      const savedUser = localStorage.getItem('loggedInUser')
      const token = localStorage.getItem('accessToken')

      // 이미 둘 다 있으면 그대로 사용
      if (savedUser && token) return

      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        })

        if (!res.ok) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('loggedInUser')
          localStorage.removeItem('userId')
          setUser(null)
          return
        }

        const data = await res.json()

        localStorage.setItem('accessToken', data.accessToken)

        if (data.user) {
          localStorage.setItem('loggedInUser', JSON.stringify(data.user))
          localStorage.setItem('userId', data.user.id.toString())
          setUser(data.user)
        } else if (savedUser) {
          setUser(JSON.parse(savedUser))
        }
      } catch (err) {
        console.error('자동 로그인 복구 실패:', err)
      }
    }

    restoreLogin()
  }, [])

  useEffect(() => {
    const loadTheme = () => {
      const saved = localStorage.getItem('loggedInUser')
      if (!saved) return

      try {
        const parsed = JSON.parse(saved)
        if (!parsed?.id) return

        const raw = localStorage.getItem(`theme_settings_${parsed.id}`)
        if (!raw) {
          setDarkMode(false)
          return
        }

        const theme = JSON.parse(raw)
        setDarkMode(theme.darkMode)
      } catch {
        setDarkMode(false)
      }
    }

    loadTheme()

    // 🔥 MyInfoPage에서 토글 시 반영
    const handler = (e: any) => {
      setDarkMode(e.detail.darkMode)
    }

    window.addEventListener('theme-change', handler)

    return () => {
      window.removeEventListener('theme-change', handler)
    }
  }, [])

  // ⭐ 모달 상태
  const [modal, setModal] = useState({
    show: false,
    message: '',
    type: 'alert',
    onConfirm: () => {},
    onCancel: () => {},
  })

  // 🔥 게시판 드롭다운
  const [dropOpen, setDropOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const loadBanStatus = async () => {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status !== 403) {
        setBanRemainMs(null)
        return
      }

      const data = await res.json()

      // ⭐⭐⭐ 핵심: banUntil 사용
      if (typeof data.banUntil === 'number') {
        const remain = data.banUntil - Date.now()
        if (remain > 0) {
          setBanRemainMs(remain)
        } else {
          setBanRemainMs(null)
        }
      }
    }

    loadBanStatus()
  }, [])

  useEffect(() => {
    if (banRemainMs === null) return

    const timer = setInterval(() => {
      setBanRemainMs((prev) => {
        if (prev === null) return null
        if (prev <= 1000) return null
        return prev - 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [banRemainMs])

  function formatRemain(ms: number) {
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60

    return `${h}시간 ${m}분 ${s}초`
  }

  // ⭐ 로그인 정보 불러오기 & 업데이트 반영
  useEffect(() => {
    const loadUser = () => {
      const saved = localStorage.getItem('loggedInUser')
      if (saved) {
        try {
          setUser(JSON.parse(saved))
        } catch {
          setUser(null)
        }
      }
    }

    loadUser()
    window.addEventListener('storage', loadUser)

    const mediaQuery = window.matchMedia('(min-width: 800px)')

    const applyLayout = (e: MediaQueryList | MediaQueryListEvent) => {
      const pc = e.matches
      setIsPC(pc)

      if (pc) {
        setSidebarOpen(true)
      } else {
        setSidebarOpen(false)
      }
    }
    applyLayout(mediaQuery)

    mediaQuery.addEventListener('change', applyLayout)

    return () => {
      window.removeEventListener('storage', loadUser)
      mediaQuery.removeEventListener('change', applyLayout)
    }
  }, [])

  // ✅ 여기 바로 아래에 추가 👇
  useEffect(() => {
    if (!isPC) {
      document.body.style.overflow = sidebarOpen ? 'hidden' : 'auto'
    }

    // 🔥 컴포넌트 언마운트 시 복구 (중요)
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [sidebarOpen, isPC])

  // ⭐ alert 모달
  const showAlert = (msg: string, callback?: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'alert',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        if (callback) callback()
      },
      onCancel: () => {},
    })
  }

  // ⭐ confirm 모달
  const showConfirm = (msg: string, yesFn: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'confirm',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        yesFn()
      },
      onCancel: () =>
        setModal((m) => ({
          ...m,
          show: false,
        })),
    })
  }

  // ⭐ 로그아웃
  const handleLogout = () => {
    showConfirm('정말 로그아웃 하시겠습니까?', () => {
      // 🔥 로그인 정보 제거
      localStorage.removeItem('loggedInUser')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userId')

      // ✅ sessionStorage만 초기화 (OK)
      sessionStorage.removeItem('banModalShown')
      sessionStorage.removeItem('unbanModalShown')

      // ❗ banStatus는 절대 지우지 말 것
      // localStorage.removeItem('banStatus')

      setUser(null)

      showAlert('로그아웃 되었습니다.', () => {
        window.location.href = '/'
      })
    })
  }

  /* 메뉴 섹션 UI */
  function dropdownItem(href: string, label: string, dark: boolean) {
    return (
      <Link
        href={href}
        onClick={() => setDropOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 16px',
          fontSize: 14,
          fontWeight: 500,
          color: dark ? '#e5e7eb' : '#111827',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Jua&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poor+Story&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Hi+Melody&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Song+Myung&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Hahmlet&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Gugi&display=swap"
          rel="stylesheet"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Nanum+Gothic&family=Gowun+Dodum&family=IBM+Plex+Sans+KR&family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Poor+Story&family=Nanum+Myeongjo&family=Noto+Serif+KR&family=Song+Myung&family=Hahmlet&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:FILL@0;1&display=swap"
          rel="stylesheet"
        />

        <style>{`
        .material-symbols-rounded {
          font-family: 'Material Symbols Rounded';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          display: inline-block;
          line-height: 1;
          white-space: nowrap;
        }
      `}</style>
      </head>
      <body
        className={effectiveDark ? 'dark' : ''}
        style={{
          margin: 0,
          background: effectiveDark ? '#0f172a' : '#f2f4f7',
          color: effectiveDark ? '#e5e7eb' : '#111827',
          fontFamily: 'Pretendard, sans-serif',
          transition: 'all 0.25s ease',
        }}
      >
        <ToastProvider>
          <ToastWatcher />
          {/* 모바일 햄버거 버튼 */}
          {!isPC && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: 'fixed',
                top: '14px',
                left: '14px',
                zIndex: 999,
                padding: '10px 14px',
                background: '#4DB8FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          )}

          {/* 사이드바 */}
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: sidebarOpen ? 0 : isPC ? '-220px' : '-260px',
              width: isPC ? '220px' : '240px',
              height: '100dvh',
              maxHeight: '100dvh',
              background:
                user?.level === 'admin'
                  ? 'linear-gradient(180deg, #0F172A, #020617)'
                  : effectiveDark
                    ? '#1e293b'
                    : '#4DB8FF',

              paddingTop: '20px',
              paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
              paddingLeft: '14px',
              paddingRight: '14px',

              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              transition: 'left 0.3s ease',
              zIndex: 998,
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 학교 이름 표시 */}
            {/* 사이드바 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              {/* 학교 이름 (관리자일 때 숨김) */}
              {user?.level !== 'admin' && (
                <Link
                  href="/"
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'white',
                    textDecoration: 'none',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.school ? `🏫 ${user.school}` : 'School Plus'}
                </Link>
              )}

              {isPC && sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  ⮜
                </button>
              )}

              {/* 모바일 X 버튼 */}
              {!isPC && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    color: 'white',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {banRemainMs !== null && (
              <div
                style={{
                  background: '#FEE2E2',
                  color: '#B91C1C',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: 1.4,
                  marginBottom: '8px',
                }}
              >
                🚫 계정 이용 제한 중<br />⏳ 해제까지{' '}
                <strong>{formatRemain(banRemainMs)}</strong>
              </div>
            )}

            {/* 메뉴 */}
            {/* ========================= */}
            {/* 사이드바 메뉴 */}
            {/* ========================= */}

            {user?.level === 'admin' ? (
              <>
                <div
                  style={{
                    fontSize: 25,
                    fontWeight: 700,
                    color: '#E0F2FE',
                    marginBottom: 6,
                  }}
                >
                  🛡 관리자
                </div>

                <AdminMenuItem
                  icon="🔔"
                  label="관리자 알림"
                  href="/admin/notifications"
                />
                <AdminMenuItem icon="🚨" label="신고된 게시글" href="/admin" />
                <AdminMenuItem
                  icon="👥"
                  label="신고자 관리"
                  href="/admin/reporters"
                />
                <AdminMenuItem
                  icon="🛠"
                  label="관리자 게시판"
                  href="/board/admin"
                />
                <AdminMenuItem
                  icon="💬"
                  label="채팅 신고 관리"
                  href="/admin/chat-report"
                />
                <AdminMenuItem
                  icon="♻️"
                  label="재가입 승인"
                  href="/admin/rejoin-requests"
                />
                <AdminMenuItem
                  icon="👤"
                  label="사용자 정보"
                  href="/admin/userinfo"
                />
              </>
            ) : (
              <>
                {/* 👤 학생 전용 메뉴 그대로 */}

                <MenuItem
                  icon="👤"
                  label="내정보"
                  href="/my-info"
                  darkMode={effectiveDark}
                />

                {/* 게시판 드롭다운 */}
                <div
                  style={{
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      setDropOpen((prev) => !prev)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: darkMode
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.25)',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: 600,
                      border: darkMode
                        ? '1px solid rgba(255,255,255,0.1)'
                        : '1px solid rgba(255,255,255,0.4)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📋</span>
                    게시판
                  </div>

                  {dropOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: 8,
                        width: 190,

                        background: effectiveDark ? '#1e293b' : '#ffffff',
                        border: effectiveDark ? '1px solid #334155' : 'none',

                        borderRadius: 12,
                        padding: '6px 0',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                        zIndex: 9999,
                      }}
                    >
                      {dropdownItem('/board', '📚 전체 게시판', effectiveDark)}
                      {dropdownItem(
                        '/board/myposts',
                        '✏ 내가 쓴 글',
                        effectiveDark,
                      )}
                      {dropdownItem(
                        '/board/scrap',
                        '⭐ 스크랩한 글',
                        effectiveDark,
                      )}
                    </div>
                  )}
                </div>

                <MenuItem
                  icon="💬"
                  label="채팅"
                  href="/chat"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="📅"
                  label="일정"
                  href="/calendar"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="⏰"
                  label="시간표"
                  href="/timetable"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="📊"
                  label="모의고사"
                  href="/mockscores"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="📊"
                  label="내신점수"
                  href="/schooltest"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="🍚"
                  label="급식표"
                  href="/meal"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="📚"
                  label="도서관"
                  href="/Library"
                  darkMode={effectiveDark}
                />
                <MenuItem
                  icon="🏫"
                  label="학교인증"
                  href="/school_certification"
                  darkMode={effectiveDark}
                />
              </>
            )}

            {/* 로그인/로그아웃 */}
            <div style={{ marginTop: 'auto' }}>
              {user ? (
                <>
                  <div
                    style={{
                      color: 'white',
                      marginBottom: '10px',
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    👋 {user.name || user.username}님
                    {user?.level === 'admin' && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#93C5FD',
                        }}
                      >
                        (관리자)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '10px',

                      background:
                        user?.level === 'admin'
                          ? '#1E293B' // 다크 네이비 (관리자)
                          : '#FF6B6B', // 빨강 (학생)

                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <MenuItem
                  icon="🔐"
                  label="로그인"
                  href="/auth/login"
                  darkMode={effectiveDark}
                />
              )}
            </div>
          </aside>

          {/* PC 열기 버튼 (사이드바 밖) */}
          {isPC && !sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: 'fixed',
                top: '20px',
                left: '10px',
                zIndex: 999,
                background: '#4DB8FF',
                color: 'white',
                border: 'none',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                fontSize: '16px',
              }}
            >
              ⮞
            </button>
          )}

          {/* overlay */}
          {!isPC && sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)} // ⭐ 핵심
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.4)',
                zIndex: 997,
              }}
            />
          )}

          {/* 메인 */}
          <main
            className="min-h-screen"
            style={{
              marginLeft: isPC ? (sidebarOpen ? '220px' : '0px') : '0px',
            }}
          >
            {children}
          </main>

          {/* 모달 */}
          {modal.show && (
            <div className="modal-backdrop">
              <div
                className="modal-box"
                style={{
                  background: effectiveDark ? '#1e293b' : '#ffffff',
                  color: effectiveDark ? '#f9fafb' : '#111827',
                }}
              >
                <div className="modal-icon">✔</div>
                <p>{modal.message}</p>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  {modal.type === 'confirm' && (
                    <button className="modal-cancel" onClick={modal.onCancel}>
                      취소
                    </button>
                  )}

                  <button className="modal-confirm" onClick={modal.onConfirm}>
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 모달 CSS */}
          <style jsx>{`
            .modal-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.35);
              backdrop-filter: blur(4px);
              display: flex;
              justify-content: center;
              align-items: center;
              z-index: 9999;
            }
            .modal-box {
              background: ${effectiveDark ? '#1e293b' : '#ffffff'};
              color: ${effectiveDark ? '#f9fafb' : '#111827'};
              padding: 22px 28px;
              border-radius: 12px;
              border: 2px solid #4fc3f7;
              box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
              text-align: center;
              animation: fadeIn 0.25s ease-out;
            }
            .modal-icon {
              color: #4fc3f7;
              font-size: 32px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .modal-confirm {
              padding: 8px 14px;
              background: #4fc3f7;
              color: white;
              border-radius: 6px;
              border: none;
              cursor: pointer;
              font-weight: 600;
            }
            .modal-cancel {
              padding: 8px 14px;
              background: #ddd;
              border-radius: 6px;
              border: none;
              cursor: pointer;
            }
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: scale(0.9);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </ToastProvider>
      </body>
    </html>
  )
}

function MenuItem({
  icon,
  label,
  href,
  darkMode,
}: {
  icon: string
  label: string
  href: string
  darkMode: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 12px',
        borderRadius: '8px',
        background: darkMode
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.25)',
        color: 'white',
        textDecoration: 'none',
        fontSize: '15px',
        fontWeight: 600,
        border: darkMode
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.4)',
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span>
      {label}
    </Link>
  )
}
function AdminMenuItem({
  icon,
  label,
  href,
}: {
  icon: string
  label: string
  href: string
}) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 10,
        background: active ? '#FFFFFF' : 'rgba(255,255,255,0.08)',
        color: active ? '#0F172A' : '#E5E7EB',
        fontWeight: 700,
        fontSize: 15,
        textDecoration: 'none',
        boxShadow: active ? '0 6px 16px rgba(0,0,0,0.15)' : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </Link>
  )
}

function ToastWatcher() {
  const { showToast } = useToast()
  const pathname = usePathname()

  const prevChatCountRef = useRef(0)
  const prevNotifyIdRef = useRef<number | null>(null)
  const isFirstLoadRef = useRef(true)

  const prevAdminNotifyIdRef = useRef<number | null>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 800

  useEffect(() => {
    // ✅ 모바일 웹에서는 토스트 알림 비활성화
    if (isMobile) return

    const checkNotifications = async () => {
      const token = localStorage.getItem('accessToken')
      const savedUser = localStorage.getItem('loggedInUser')
      if (!token || !savedUser) return

      const user = JSON.parse(savedUser)

      // 🔥 알림 설정 읽기
      const raw = localStorage.getItem(`notification_settings_${user.id}`)

      const settings = raw
        ? JSON.parse(raw)
        : {
            chat: true,
            postComment: true,
            commentReply: true,
          }

      /* ===================== */
      /* 💬 채팅 */
      /* ===================== */

      const isChatPage = pathname.startsWith('/chat')

      if (settings.chat && !isChatPage) {
        const chatRes = await fetch('/api/chat/unread-summary', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (chatRes.ok) {
          const data = await chatRes.json()

          if (
            !isFirstLoadRef.current &&
            data.unreadCount > prevChatCountRef.current &&
            data.messages?.length > 0
          ) {
            const latest = data.messages[0]
            showToast(`💬 ${latest.senderName}`, latest.content, 'chat')
          }

          prevChatCountRef.current = data.unreadCount
        }
      }

      /* ===================== */
      /* 📢 댓글 */
      /* ===================== */

      const notifyRes = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (notifyRes.ok) {
        const list = await notifyRes.json()

        if (Array.isArray(list) && list.length > 0) {
          const latest = list[0]

          if (
            !isFirstLoadRef.current &&
            latest.id !== prevNotifyIdRef.current
          ) {
            if (latest.type === 'post_commented' && settings.postComment) {
              showToast('💬 내 게시글에 댓글', latest.message, 'postComment')
            }

            if (latest.type === 'comment_reply' && settings.commentReply) {
              showToast('↪️ 내 댓글에 답글', latest.message, 'commentReply')
            }
          }

          prevNotifyIdRef.current = latest.id
        }
      }

      /* ===================== */
      /* 🛡 관리자 알림 */
      /* ===================== */

      if (user.level === 'admin') {
        const adminRes = await fetch('/api/admin/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (adminRes.ok) {
          const list = await adminRes.json()

          if (Array.isArray(list) && list.length > 0) {
            const latest = list[0]

            if (
              !isFirstLoadRef.current &&
              latest.id !== prevAdminNotifyIdRef.current
            ) {
              if (latest.type === 'chat_report') {
                showToast('🚨 채팅 신고', latest.message, 'admin')
              } else if (latest.type === 'report_post') {
                showToast('🚨 게시글 신고', latest.message, 'admin')
              } else if (latest.type === 'admin_inquiry') {
                showToast('📩 관리자 문의', latest.message, 'admin')
              } else {
                showToast('🔔 관리자 알림', latest.message, 'admin')
              }
            }

            prevAdminNotifyIdRef.current = latest.id
          }
        }
      }

      isFirstLoadRef.current = false
    }

    checkNotifications()
    const interval = setInterval(checkNotifications, 5000)
    return () => clearInterval(interval)
  }, [pathname, isMobile])

  return null
}
