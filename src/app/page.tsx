'use client'

import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import LibraryRecommend from '../components/Library'
import TimetablePreview from '../components/Dashboard/TimetablePreview'
import Link from 'next/link'
import { apiFetch } from '@/src/lib/apiFetch'
import { useRef } from 'react'

interface Post {
  id: string
  author: string
  title: string
  content: string
  likes: number
  category: string
  createdAt: number
}

// ⬇️ startTime(시간) 필드 포함
interface HomeCalendarItem {
  date: string
  dateLabel: string
  event: string
  ddayLabel: string
  diffDays: number
  weekdayIndex: number
  weekdayLabel: string
  startTime?: string // "HH:MM"
}

type DBEvent = {
  id: number
  title: string
  event_date: string
  start_time?: string
}

type UnreadMessage = {
  messageId: number
  roomId: number
  senderId: number
  senderName: string
  content: string
  createdAt: string
}

export default function HomePage() {
  const [user, setUser] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [today, setToday] = useState<string>('')
  const [calendar, setCalendar] = useState<HomeCalendarItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [isChatNoticeOpen, setIsChatNoticeOpen] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([])
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [unbanModalOpen, setUnbanModalOpen] = useState(false)

  const prevLatestNotificationIdRef = useRef<number | null>(null)

  const prevNotifyCountRef = useRef(0)
  const prevChatCountRef = useRef(0)
  const isFirstLoadRef = useRef(true)
  const isFirstChatLoadRef = useRef(true)

  // 🔔 관리자 알림
  const [unreadNotifyCount, setUnreadNotifyCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])

  const [banInfo, setBanInfo] = useState<{
    reason: string
    remainHours?: number
  } | null>(null)

  // 🔔 토스트 알림
  const [toastList, setToastList] = useState<
    { id: number; title: string; message: string }[]
  >([])

  // 🌙 다크모드 상태
  const [themeSetting, setThemeSetting] = useState<{ darkMode: boolean }>({
    darkMode: false,
  })

  // 🌙 초기 다크모드 로딩
  useEffect(() => {
    try {
      const raw = localStorage.getItem('theme_settings')
      if (!raw) return
      const parsed = JSON.parse(raw)
      setThemeSetting({ darkMode: !!parsed.darkMode })
    } catch {
      // 무시
    }
  }, [])

  // 🌙 내정보 등에서 theme-change 발생 시 반영
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (!e?.detail) return
      setThemeSetting({ darkMode: !!e.detail.darkMode })
    }

    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  const loadNotifications = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await apiFetch('/api/notifications')
    if (!res.ok) return

    const data = await res.json()
    setNotifications(data || [])

    if (!Array.isArray(data) || data.length === 0) return

    const latest = data[0]

    // 🔥 이전 알림과 다를 때만 토스트
    if (
      latest.id !== prevLatestNotificationIdRef.current &&
      (latest.type === 'post_commented' || latest.type === 'comment_reply')
    ) {
      showToast(
        latest.type === 'post_commented'
          ? '💬 내 게시글에 댓글'
          : '↪️ 내 댓글에 답글',
        latest.message,
        latest.type === 'post_commented' ? 'postComment' : 'commentReply',
      )
    }

    // ⭐ 현재 최신 id 저장
    prevLatestNotificationIdRef.current = latest.id
  }

  const deleteNotification = async (id: number) => {
    await apiFetch('/api/notifications/delete', {
      method: 'POST',
      body: JSON.stringify({ id }),
    })

    // 🔥 화면에서 즉시 제거
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    // 🔔 카운트 감소
    setUnreadNotifyCount((prev) => Math.max(0, prev - 1))
  }

  useEffect(() => {
    if (isLoggingOut) return

    const checkBanStatus = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const res = await apiFetch('/api/auth/me')

      const prevStatus = localStorage.getItem('banStatus')

      // 🚫 현재 정지 상태
      if (res.status === 403) {
        const data = await res.json()

        // ⭐ 상태 기록
        localStorage.setItem('banStatus', 'banned')

        // ⭐⭐ 다음 해제 모달을 위해 초기화
        sessionStorage.removeItem('unbanModalShown')

        // ⭐ 이미 이번 정지에서 모달 봤으면 스킵
        if (sessionStorage.getItem('banModalShown') === 'true') return

        setBanInfo({
          reason: data.reason,
          remainHours: data.remainHours,
        })

        // ⭐ 이번 정지에서 모달 봤다고 기록
        sessionStorage.setItem('banModalShown', 'true')

        return
      }

      // ✅ 현재 정상 상태
      if (res.ok) {
        if (
          prevStatus === 'banned' &&
          sessionStorage.getItem('unbanModalShown') !== 'true'
        ) {
          // 🔓 계정 해제 모달
          setUnbanModalOpen(true)
          sessionStorage.setItem('unbanModalShown', 'true')

          // ⭐ 핵심: 해제 모달을 띄운 "그 순간"에만 정리
          localStorage.removeItem('banStatus')
          sessionStorage.removeItem('banModalShown')
        } else {
          // 🔄 원래부터 정상 유저인 경우만 normal 유지
          localStorage.setItem('banStatus', 'normal')
        }
      }
    }

    checkBanStatus()
  }, [isLoggingOut])

  useEffect(() => {
    const loadUnreadChat = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const res = await apiFetch('/api/chat/unread-count')

      if (!res.ok) return

      const data = await res.json()
      setUnreadChatCount(data.unreadCount || 0)
    }

    loadUnreadChat()
  }, [])

  const showToast = (
    title: string,
    message: string,
    type?: 'chat' | 'postComment' | 'commentReply',
  ) => {
    const raw = localStorage.getItem('notification_settings')
    if (raw) {
      const settings = JSON.parse(raw)

      if (type && settings[type] === false) {
        return // 🔥 설정 꺼져있으면 토스트 안 띄움
      }
    }

    const id = Date.now()

    setToastList((prev) => [...prev, { id, title, message }])

    setTimeout(() => {
      setToastList((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  const loadUnreadChatSummary = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await apiFetch('/api/chat/unread-summary')
    if (!res.ok) return

    const data = await res.json()

    setUnreadMessages(data.messages || [])
    setUnreadChatCount(data.unreadCount || 0)

    if (
      !isFirstChatLoadRef.current &&
      data.unreadCount > prevChatCountRef.current &&
      data.messages?.length > 0
    ) {
      const latest = data.messages[0]
      showToast(`💬 ${latest.senderName}`, latest.content, 'chat')
    }

    prevChatCountRef.current = data.unreadCount
    isFirstChatLoadRef.current = false
  }

  const loadUnreadNotifications = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await apiFetch('/api/notifications/unread-count')
    if (!res.ok) return

    const data = await res.json()

    setUnreadNotifyCount(data.unreadCount || 0)

    if (
      !isFirstLoadRef.current &&
      data.unreadCount > prevNotifyCountRef.current
    ) {
      showToast(
        '📢 새로운 알림',
        '새로운 공지/알림이 도착했습니다.',
        'postComment', // 또는 'commentReply'
      )
    }

    prevNotifyCountRef.current = data.unreadCount
    isFirstLoadRef.current = false
  }

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    // 처음 한 번 실행
    loadUnreadChatSummary()
    loadUnreadNotifications()
    loadNotifications()

    // 5초마다 자동 체크
    const interval = setInterval(() => {
      loadUnreadChatSummary()
      loadUnreadNotifications()
      loadNotifications()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const CATEGORY_TABS = [
    { key: 'all', label: '전체' },
    { key: 'free', label: '자유게시판' },
    { key: 'promo', label: '홍보게시판' },
    { key: 'club', label: '동아리게시판' },
    { key: 'grade1', label: '1학년게시판' },
    { key: 'grade2', label: '2학년게시판' },
    { key: 'grade3', label: '3학년게시판' },
  ]

  // 🔵 추가된 부분: 추천도서 표시 여부
  const [showRecommend, setShowRecommend] = useState(false)

  useEffect(() => {
    // 로그인 유저
    setUser(localStorage.getItem('loggedInUser') || null)

    /* ==========================================
       🔥 A 방식: 모든 게시판 데이터 합치기
    ========================================== */
    async function loadPopularPosts() {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const categories = ['free', 'promo', 'club', 'grade1', 'grade2', 'grade3']
      let merged: Post[] = []

      for (const cat of categories) {
        const res = await apiFetch(`/api/posts?category=${cat}`)

        if (!res.ok) continue

        const posts: Post[] = await res.json()

        // 👍 각 카테고리에서 좋아요 기준 상위 1~5개만
        const top = posts
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 5)

        merged.push(...top)
      }

      // 전체에서 다시 인기순 정렬
      merged.sort((a, b) => (b.likes || 0) - (a.likes || 0))

      // 홈에는 최대 3~5개만
      setPosts(merged)
    }
    loadPopularPosts()

    /* ==========================================
       📆 오늘 요일
    ========================================== */
    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
    const now = new Date()
    setToday(`${dayNames[now.getDay()]}요일`)

    /* ==========================================
       📅 홈 캘린더 일정 불러오기
       👉 이번 주(월~일) 안 + 오늘 이후 일정만
    ========================================== */
    async function loadHomeCalendar() {
      try {
        const userId = localStorage.getItem('userId')
        if (!userId) return

        const eduCode = localStorage.getItem('eduCode')
        const schoolCode = localStorage.getItem('schoolCode')

        const today = new Date()
        const msPerDay = 1000 * 60 * 60 * 24

        const todayZero = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
        ).getTime()

        const weekday = today.getDay()
        const diffToMonday = (weekday + 6) % 7
        const weekStart = todayZero - diffToMonday * msPerDay
        const weekEnd = weekStart + 6 * msPerDay

        const dayNames = ['일', '월', '화', '수', '목', '금', '토']
        let list: HomeCalendarItem[] = []

        /* ======================
       🔹 내 일정
    ====================== */
        const res = await apiFetch(`/api/calendar-events?userId=${userId}`)

        if (res.ok) {
          const rows: DBEvent[] = await res.json()

          rows.forEach((ev) => {
            const dateKey = ev.event_date.slice(0, 10)
            const [y, m, d] = dateKey.split('-').map(Number)
            const dateZero = new Date(y, m - 1, d).getTime()

            if (dateZero < todayZero) return
            if (dateZero < weekStart || dateZero > weekEnd) return

            const diffDays = Math.floor((dateZero - todayZero) / msPerDay)
            const weekdayIndex = new Date(y, m - 1, d).getDay()

            list.push({
              date: dateKey,
              dateLabel: `${m}월 ${d}일 (${dayNames[weekdayIndex]})`,
              event: ev.title,
              ddayLabel: diffDays === 0 ? 'D-Day' : `D-${diffDays}`,
              diffDays,
              weekdayIndex,
              weekdayLabel: dayNames[weekdayIndex],
              startTime: ev.start_time,
            })
          })
        }

        /* ======================
       🔹 학사일정
    ====================== */
        if (eduCode && schoolCode) {
          const acaRes = await fetch(
            `/api/academic-events?eduCode=${eduCode}&schoolCode=${schoolCode}&year=${today.getFullYear()}&month=${today.getMonth() + 1}`,
          )

          if (acaRes.ok) {
            const aca = await acaRes.json()

            aca.forEach((ev: any) => {
              const [y, m, d] = ev.date.split('-').map(Number)
              const dateZero = new Date(y, m - 1, d).getTime()

              if (dateZero < todayZero) return
              if (dateZero < weekStart || dateZero > weekEnd) return

              const diffDays = Math.floor((dateZero - todayZero) / msPerDay)
              const weekdayIndex = new Date(y, m - 1, d).getDay()

              list.push({
                date: ev.date,
                dateLabel: `${m}월 ${d}일 (${dayNames[weekdayIndex]})`,
                event: ev.title,
                ddayLabel: diffDays === 0 ? 'D-Day' : `D-${diffDays}`,
                diffDays,
                weekdayIndex,
                weekdayLabel: dayNames[weekdayIndex],
              })
            })
          }
        }

        list.sort((a, b) =>
          a.diffDays === b.diffDays
            ? timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
            : a.diffDays - b.diffDays,
        )

        setCalendar(list)
      } catch (err) {
        console.error('홈 캘린더 로드 실패:', err)
        setCalendar([])
      }
    }
    loadHomeCalendar()
  }, [])

  /* ==========================================
     🔥 인기 게시물 3개
  ========================================== */
  const popularPosts = [...posts].sort(
    (a, b) => (b.likes || 0) - (a.likes || 0),
  )

  const filteredPopularPosts =
    selectedCategory === 'all'
      ? popularPosts
      : popularPosts.filter((p) => p.category === selectedCategory)

  /* ==========================================
     📆 오늘 & 이번주 일정 분리
  ========================================== */
  const todayItems = calendar.filter((c) => c.diffDays === 0)
  const weekItems = calendar.filter((c) => c.diffDays > 0)

  const timeToMinutes = (time?: string): number => {
    if (!time) return 24 * 60 + 59
    const [h, m] = time.split(':').map(Number)
    if (Number.isNaN(h) || Number.isNaN(m)) return 24 * 60 + 59
    return h * 60 + m
  }

  const sortedTodayItems = [...todayItems].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  )

  const sortedWeekItems = [...weekItems].sort((a, b) => {
    if (a.diffDays === b.diffDays) {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    }
    return a.diffDays - b.diffDays
  })

  return (
    <>
      {/* 🔓 계정 해제 안내 모달 */}
      {unbanModalOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '420px',
              background: themeSetting.darkMode ? '#1e293b' : '#fff',
              color: themeSetting.darkMode ? '#f9fafb' : '#111827',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ color: '#2E7D32', marginBottom: '12px' }}>
              ✅ 계정 이용 제한 해제
            </h2>

            <p
              style={{ fontSize: '15px', color: '#444', marginBottom: '12px' }}
            >
              계정 이용 제한이 해제되었습니다.
            </p>

            <p
              style={{
                fontSize: '14px',
                color: themeSetting.darkMode ? '#cbd5e1' : '#555',
              }}
            >
              다시 게시글·댓글을 작성할 수 있습니다 🎉
            </p>

            <button
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#4FC3F7',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setUnbanModalOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
      {/* 🚫 계정 정지 모달 */}
      {banInfo && !isLoggingOut && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '420px',
              background: themeSetting.darkMode ? '#1e293b' : '#fff',
              color: themeSetting.darkMode ? '#f9fafb' : '#111827',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ color: '#d32f2f', marginBottom: '12px' }}>
              🚫 계정 이용 제한
            </h2>

            <p
              style={{ fontSize: '15px', color: '#444', marginBottom: '12px' }}
            >
              {banInfo.reason}
            </p>

            {banInfo.remainHours !== undefined && (
              <p style={{ fontSize: '14px', color: '#666' }}>
                남은 정지 시간: <strong>{banInfo.remainHours}시간</strong>
              </p>
            )}

            <p
              style={{
                fontSize: '14px',
                color: themeSetting.darkMode ? '#cbd5e1' : '#555',
                marginTop: '10px',
              }}
            >
              현재 계정은 <strong>게시글 작성 및 댓글 작성과 채팅 제한</strong>
              되어 있습니다.
              <br />
              문의사항은 아래 고객센터로 연락을 주세요.
            </p>

            <p
              style={{
                fontSize: '14px',
                color: themeSetting.darkMode ? '#cbd5e1' : '#555',
                marginTop: '10px',
              }}
            >
              SchoolPlus 고객센터 : 0000-0000
            </p>

            <button
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#4FC3F7',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => {
                sessionStorage.setItem('banModalShown', 'true') // ⭐ 여기
                setBanInfo(null)
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          width: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
          padding: 'clamp(8px, 3vw, 16px)',
          backgroundColor: themeSetting.darkMode ? '#020617' : '#fff',
          color: themeSetting.darkMode ? '#e5e7eb' : '#111827',
          borderRadius: '14px',
          boxShadow: themeSetting.darkMode
            ? '0 2px 12px rgba(15,23,42,0.7)'
            : '0 2px 8px rgba(0,0,0,0.07)',
        }}
      >
        {/* ------------------ 상단 ------------------ */}

        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '32px',
            zIndex: 1000,
          }}
        >
          <div style={{ position: 'relative' }}>
            <span
              style={{
                fontSize: '24px',
                cursor: 'pointer',
                display: 'inline-block',
              }}
              aria-label="채팅 알림"
              onClick={() => {
                setIsChatNoticeOpen((v) => !v)
                loadUnreadChatSummary()
                loadNotifications()
              }}
            >
              🔔
            </span>

            {unreadChatCount + unreadNotifyCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#e53935',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '999px',
                  lineHeight: 1,
                }}
              >
                {unreadChatCount + unreadNotifyCount}
              </span>
            )}

            {isChatNoticeOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '36px',
                  right: 0,
                  width: '320px',
                  background: themeSetting.darkMode ? '#0f172a' : '#fff',
                  color: themeSetting.darkMode ? '#e5e7eb' : '#111827',
                  borderRadius: '12px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  padding: '12px',
                  zIndex: 1001,
                }}
              >
                {/* ================= 💬 채팅 알림 ================= */}
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  💬 채팅 알림
                </div>

                {unreadMessages.length === 0 ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: themeSetting.darkMode ? '#94a3b8' : '#777',
                      marginBottom: 10,
                    }}
                  >
                    새로운 채팅이 없습니다.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        marginBottom: 10,
                      }}
                    >
                      {unreadMessages.map((msg) => (
                        <div
                          key={`${msg.roomId}-${msg.messageId}`}
                          style={{
                            padding: '8px',
                            borderBottom: themeSetting.darkMode
                              ? '1px solid #334155'
                              : '1px solid #eee',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            setIsChatNoticeOpen(false)
                            window.location.href = `/chat?roomId=${msg.roomId}`
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            👤 {msg.senderName}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#555',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ✅ 채팅방으로 가기 버튼 */}
                    <Link
                      href="/chat"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        background: '#4FC3F7',
                        color: 'white',
                        padding: '8px 0',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: 'none',
                        marginBottom: '12px',
                      }}
                      onClick={() => setIsChatNoticeOpen(false)}
                    >
                      채팅방으로 가기 →
                    </Link>
                  </>
                )}

                {/* ================= 📢 알림 ================= */}
                <div style={{ fontWeight: 700, marginBottom: 6 }}>📢 알림</div>

                {notifications.length === 0 ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: themeSetting.darkMode ? '#94a3b8' : '#777',
                    }}
                  >
                    새로운 알림이 없습니다.
                  </p>
                ) : (
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          background: n.is_read
                            ? themeSetting.darkMode
                              ? '#0f172a'
                              : '#fff'
                            : themeSetting.darkMode
                              ? '#1e3a8a'
                              : '#E3F2FD',
                          position: 'relative',
                        }}
                        onClick={async () => {
                          await apiFetch('/api/notifications', {
                            method: 'PATCH',
                            body: JSON.stringify({ notificationId: n.id }),
                          })
                          setIsChatNoticeOpen(false)
                          window.location.href = n.link
                        }}
                      >
                        {/* ❌ 삭제 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation() // 🔥 이동 & 읽음 처리 방지
                            deleteNotification(n.id)
                          }}
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            border: 'none',
                            background: 'transparent',
                            color: '#9CA3AF',
                            fontSize: 14,
                            cursor: 'pointer',
                          }}
                          title="알림 삭제"
                        >
                          ✕
                        </button>

                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {n.type === 'post_commented'}
                          {n.type === 'comment_reply'}
                          {n.type.startsWith('admin_') && '📢 '}
                          {n.title}
                        </div>

                        <div style={{ fontSize: 12, color: '#555' }}>
                          {n.message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <h2
          style={{
            fontSize: 'clamp(20px, 4vw, 28px)',
            fontWeight: 700,
            color: '#4FC3F7',
            marginBottom: '8px',
            textAlign: 'center',
          }}
        >
          School Plus
        </h2>

        <p
          style={{
            color: '#666',
            marginBottom: '28px',
            fontSize: 'clamp(13px, 2.5vw, 16px)',
            textAlign: 'center',
          }}
        >
          학생 생활을 한눈에 확인하세요 📚
        </p>

        {/* 🔥 오늘의 급식 */}
        <section style={{ marginBottom: '26px' }}>
          <Footer />
        </section>

        {/* 🔵 오늘의 추천 도서 버튼 */}
        <section style={{ marginBottom: '16px', textAlign: 'left' }}>
          <button
            onClick={() => setShowRecommend(!showRecommend)}
            style={{
              padding: '10px 18px',
              background: themeSetting.darkMode ? '#1e40af' : '#4FC3F7',
              color: 'white',
              borderRadius: '10px',
              fontWeight: 600,
              border: themeSetting.darkMode ? '1px solid #334155' : 'none',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: themeSetting.darkMode
                ? '0 2px 8px rgba(0,0,0,0.6)'
                : '0 2px 5px rgba(0,0,0,0.15)',
              transition: '0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = themeSetting.darkMode
                ? '#2563eb'
                : '#38bdf8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = themeSetting.darkMode
                ? '#1e40af'
                : '#4FC3F7'
            }}
          >
            {showRecommend ? '추천 도서 접기' : '오늘의 추천 도서 보기'}
          </button>
        </section>

        {/* 🔵 오늘의 추천 도서 섹션 (토글) */}
        {showRecommend && (
          <section style={{ marginBottom: '26px' }}>
            <LibraryRecommend />
          </section>
        )}

        {/* ------------------ 오늘 일정 ------------------ */}
        <section style={{ marginBottom: '26px' }}>
          <h3
            style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              fontWeight: 700,
              color: '#4FC3F7',
              borderBottom: '2px solid #4FC3F7',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            📆 오늘 일정
          </h3>

          {sortedTodayItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '14px' }}>
              오늘은 등록된 일정이 없습니다.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto', // 🔥 무조건 가로 스크롤
                  WebkitOverflowScrolling: 'touch', // 🔥 iOS 부드러운 스크롤
                  paddingBottom: '8px',
                }}
              >
                {sortedTodayItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/calendar?date=${item.date}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      flex: '0 0 clamp(240px, 80vw, 320px)',

                      // 🔥 카드 고정 폭
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: themeSetting.darkMode
                          ? '#1e293b'
                          : '#E1F5FE',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <strong
                          style={{
                            color: themeSetting.darkMode
                              ? '#93c5fd'
                              : '#0277BD',
                          }}
                        >
                          {item.dateLabel}
                        </strong>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#c62828',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: '#ffebee',
                          }}
                        >
                          {item.ddayLabel}
                        </span>
                      </div>
                      <p
                        style={{
                          marginTop: '2px',
                          color: themeSetting.darkMode ? '#cbd5e1' : '#555',
                        }}
                      >
                        {item.event}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ------------------ 이번 주 일정 ------------------ */}
        <section style={{ marginBottom: '36px' }}>
          <h3
            style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              fontWeight: 700,
              color: '#4FC3F7',
              borderBottom: '2px solid #4FC3F7',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            📅 이번 주 일정
          </h3>

          {sortedWeekItems.length === 0 ? (
            <p style={{ color: '#888', fontSize: '14px' }}>
              이번 주에 등록된 일정이 없습니다.
            </p>
          ) : (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  overflowX: 'auto', // 🔥 무조건 가로 스크롤
                  WebkitOverflowScrolling: 'touch', // 🔥 iOS 부드러운 스크롤
                  paddingBottom: '8px',
                }}
              >
                {sortedWeekItems.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/calendar?date=${item.date}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      flex: '0 0 clamp(240px, 80vw, 320px)',

                      // 🔥 카드 고정 폭
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: themeSetting.darkMode
                          ? '#1e293b'
                          : '#E1F5FE',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 6,
                        }}
                      >
                        <strong
                          style={{
                            color: themeSetting.darkMode
                              ? '#93c5fd'
                              : '#0277BD',
                          }}
                        >
                          {item.dateLabel}
                        </strong>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#c62828',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            background: '#ffebee',
                          }}
                        >
                          {item.ddayLabel}
                        </span>
                      </div>
                      <p
                        style={{
                          marginTop: '2px',
                          color: themeSetting.darkMode ? '#cbd5e1' : '#555',
                        }}
                      >
                        {item.event}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ------------------ 오늘 시간표 ------------------ */}
        <section style={{ marginBottom: '36px' }}>
          <h3
            style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              fontWeight: 700,
              color: '#4FC3F7',
              borderBottom: '2px solid #4FC3F7',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            📚 오늘의 시간표 ({today})
          </h3>

          <TodayTimetable today={today} darkMode={themeSetting.darkMode} />
        </section>

        {/* ------------------ 주간 시간표 ------------------ */}
        <TimetablePreview />

        {/* ------------------ 인기 게시물 ------------------ */}
        <section style={{ marginTop: '36px' }}>
          <h3
            style={{
              fontSize: 'clamp(16px, 3vw, 20px)',
              fontWeight: 700,
              color: '#4FC3F7',
              borderBottom: '2px solid #4FC3F7',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            🔥 인기 게시물
          </h3>

          {/* 🔘 게시판 선택 버튼 */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '6px',
              marginBottom: '14px',
            }}
          >
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.key

              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    transition: '0.2s',

                    background: isActive
                      ? '#4FC3F7'
                      : themeSetting.darkMode
                        ? '#1e293b'
                        : '#E1F5FE',

                    color: isActive
                      ? 'white'
                      : themeSetting.darkMode
                        ? '#93c5fd'
                        : '#0277BD',

                    border: themeSetting.darkMode
                      ? '1px solid #334155'
                      : 'none',

                    boxShadow: themeSetting.darkMode
                      ? '0 1px 4px rgba(0,0,0,0.4)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = themeSetting.darkMode
                        ? '#334155'
                        : '#dbeafe'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = themeSetting.darkMode
                        ? '#1e293b'
                        : '#E1F5FE'
                    }
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {popularPosts.length === 0 ? (
            <p style={{ color: '#888' }}>아직 게시글이 없습니다.</p>
          ) : (
            <div
              style={{
                maxHeight: '420px', // 🔥 카드 3개 정도 높이
                overflowY: filteredPopularPosts.length > 3 ? 'auto' : 'visible',
                paddingRight: '6px',
              }}
            >
              {filteredPopularPosts.map((p) => {
                const categoryNames: Record<string, string> = {
                  free: '자유',
                  promo: '홍보',
                  club: '동아리',
                  grade1: '1학년',
                  grade2: '2학년',
                  grade3: '3학년',
                }

                return (
                  <Link
                    href={`/board/post/${p.id}`}
                    key={p.id}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        backgroundColor: themeSetting.darkMode
                          ? '#1e293b'
                          : 'white',
                        border: themeSetting.darkMode
                          ? '1px solid #334155'
                          : '2px solid #E1F5FE',
                        boxShadow: themeSetting.darkMode
                          ? '0 2px 8px rgba(0,0,0,0.5)'
                          : '0 2px 5px rgba(0,0,0,0.05)',
                        borderRadius: '12px',
                        padding: '14px',
                        marginBottom: '14px',
                        transition: '0.2s',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          themeSetting.darkMode ? '#334155' : '#E1F5FE')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          themeSetting.darkMode ? '#1e293b' : 'white')
                      }
                    >
                      {/* ⬇️ 기존 카드 내용 그대로 */}
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          backgroundColor: '#4FC3F7',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: 'clamp(11px, 2vw, 13px)',
                          fontWeight: 600,
                          marginBottom: '8px',
                        }}
                      >
                        {categoryNames[p.category || ''] || '기타'}
                      </span>

                      <h4
                        style={{
                          fontSize: 'clamp(14px, 3vw, 17px)',
                          fontWeight: 600,
                          color: themeSetting.darkMode ? '#f1f5f9' : '#333',
                          marginBottom: '4px',
                        }}
                      >
                        {p.title}
                      </h4>

                      <p
                        style={{
                          fontSize: 'clamp(12px, 2.3vw, 14px)',
                          color: themeSetting.darkMode ? '#cbd5e1' : '#555',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {p.content}
                      </p>

                      <div
                        style={{
                          fontSize: 'clamp(11px, 2vw, 13px)',
                          color: '#777',
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginTop: '8px',
                        }}
                      >
                        <span>작성자: {p.author}</span>
                        <span>💙 {p.likes || 0}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          zIndex: 99999,
        }}
      >
        {toastList.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: '260px',
              maxWidth: '320px',
              background: themeSetting.darkMode ? '#0f172a' : '#fff',
              padding: '14px 16px',
              borderRadius: '14px',
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
              transform: 'translateX(0)',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 4,
                color: themeSetting.darkMode ? '#e5e7eb' : '#111827',
              }}
            >
              {toast.title}
            </div>
            <div
              style={{
                fontSize: 13,
                color: themeSetting.darkMode ? '#cbd5f5' : '#555',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function getSavedTerm(): { year: number; semester: '1학기' | '2학기' } {
  const raw = localStorage.getItem('current_timetable_term')
  if (!raw) {
    const month = new Date().getMonth() + 1
    return {
      year: new Date().getFullYear(),
      semester: month >= 3 && month <= 8 ? '1학기' : '2학기',
    }
  }
  return JSON.parse(raw)
}

/* ======================================================
   📘 TodayTimetable (오늘 시간표)
====================================================== */

const SUBJECT_COLORS: Record<string, string> = {
  국어: '#FFCDD2',
  수학: '#BBDEFB',
  영어: '#C8E6C9',
  통합과학: '#D1C4E9',
  과학탐구실험: '#D1C4E9',
  통합사회: '#FFE0B2',
  체육: '#B3E5FC',
  음악: '#F8BBD0',
  미술: '#DCEDC8',
  자율학습: '#FFF9C4',
  한국사: '#E0E0E0',
}

const generatePastelColor = () =>
  `hsl(${Math.floor(Math.random() * 360)}, 70%, 85%)`

const getSubjectColor = (subject: string) => {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject]

  const saved = localStorage.getItem(`subject-color-${subject}`)
  if (saved) return saved

  const newColor = generatePastelColor()
  localStorage.setItem(`subject-color-${subject}`, newColor)
  return newColor
}

function TodayTimetable({
  today,
  darkMode,
}: {
  today: string
  darkMode: boolean
}) {
  const [todayList, setTodayList] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem('loggedInUser')
        if (!stored) return

        const user = JSON.parse(stored)

        const termRaw = localStorage.getItem('current_timetable_term')
        if (!termRaw) return

        const { year, semester } = JSON.parse(termRaw)

        const res = await apiFetch(
          `/api/timetable?year=${year}&semester=${semester}`,
        )

        if (!res.ok) return

        let data = null

        if (res.headers.get('content-length') !== '0') {
          data = await res.json()
        }

        if (!Array.isArray(data)) return

        const todayShort = today.replace('요일', '') // 월/화/수...

        const filtered = data
          .filter((c) => c.day === todayShort && c.subject && c.subject.trim())
          .sort((a, b) => a.period - b.period)

        setTodayList(filtered)
      } catch (e) {
        console.error('오늘 시간표 로드 실패', e)
        setTodayList([])
      }
    }

    load()
  }, [today])

  if (todayList.length === 0) {
    return (
      <p
        style={{
          color: darkMode ? '#cbd5e1' : '#777',
          backgroundColor: darkMode ? '#1e293b' : '#E1F5FE',
          padding: '16px',
          borderRadius: '12px',
        }}
      >
        오늘은 등록된 수업이 없습니다.
      </p>
    )
  }

  return (
    <div
      style={{
        backgroundColor: darkMode ? '#1e293b' : '#E1F5FE',
        borderRadius: '12px',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '8px',
      }}
    >
      {todayList.map((c, i) => {
        const bg = getSubjectColor(c.subject)
        return (
          <div
            key={i}
            style={{
              background: bg, // ✅ 여기만 변경
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontWeight: 700 }}>{c.period}교시</div>
            <div>{c.subject}</div>
            <div
              style={{
                fontSize: '13px',
                color: darkMode ? '#e2e8f0' : '#555',
              }}
            >
              👨‍🏫 {c.teacher || '미입력'}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: darkMode ? '#cbd5e1' : '#777',
              }}
            >
              🏫 {c.room || '미지정'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
