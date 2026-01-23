'use client'

import { useEffect, useState } from 'react'
import Footer from '../components/Footer'
import LibraryRecommend from '../components/Library'
import TimetablePreview from '../components/Dashboard/TimetablePreview'
import Link from 'next/link'

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

export default function HomePage() {
  const [user, setUser] = useState<string | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [today, setToday] = useState<string>('')
  const [calendar, setCalendar] = useState<HomeCalendarItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

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
        const res = await fetch(`/api/posts?category=${cat}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

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
        const res = await fetch(
          `/api/calendar-events?userId=${userId}`,
          { credentials: 'include' }, // 🔥 중요
        )

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
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: 'clamp(8px, 3vw, 16px)',
        backgroundColor: '#fff',
        borderRadius: '14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      }}
    >
      {/* ------------------ 상단 ------------------ */}
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
            background: '#4FC3F7',
            color: 'white',
            borderRadius: '10px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
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
                      backgroundColor: '#E1F5FE',
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
                      <strong style={{ color: '#0277BD' }}>
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
                    <p style={{ marginTop: '2px', color: '#555' }}>
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
                      backgroundColor: '#E1F5FE',
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
                      <strong style={{ color: '#0277BD' }}>
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
                    <p style={{ marginTop: '2px', color: '#555' }}>
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

        <TodayTimetable today={today} />
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
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                background:
                  selectedCategory === tab.key ? '#4FC3F7' : '#E1F5FE',
                color: selectedCategory === tab.key ? 'white' : '#0277BD',
                whiteSpace: 'nowrap', // ⭐ 줄바꿈 방지 (핵심)
                flex: '0 0 auto', // ⭐ 버튼 폭 고정
              }}
            >
              {tab.label}
            </button>
          ))}
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
                      backgroundColor: 'white',
                      border: '2px solid #E1F5FE',
                      borderRadius: '12px',
                      padding: '14px',
                      marginBottom: '14px',
                      transition: '0.2s',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = '#E1F5FE')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'white')
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
                        color: '#333',
                        marginBottom: '4px',
                      }}
                    >
                      {p.title}
                    </h4>

                    <p
                      style={{
                        fontSize: 'clamp(12px, 2.3vw, 14px)',
                        color: '#555',
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

function TodayTimetable({ today }: { today: string }) {
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

        const res = await fetch(
          `/api/timetable?year=${year}&semester=${semester}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
            },
          },
        )

        if (!res.ok) return

        const data = await res.json()
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
          color: '#777',
          background: '#E1F5FE',
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
        backgroundColor: '#E1F5FE',
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
            <div style={{ fontSize: '13px', color: '#555' }}>
              👨‍🏫 {c.teacher || '미입력'}
            </div>
            <div style={{ fontSize: '12px', color: '#777' }}>
              🏫 {c.room || '미지정'}
            </div>
          </div>
        )
      })}
    </div>
  )
}
