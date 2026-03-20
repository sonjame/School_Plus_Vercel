'use client'

import { useEffect, useState, useRef } from 'react'

// ---------------------------
//  급식 API 불러오기 함수 (단일 날짜 조회)
// ---------------------------

function getWeekDates() {
  const today = new Date()
  const kr = new Date(today.getTime() + 9 * 60 * 60 * 1000)

  // 📌 오늘의 요일 (0=일)
  const day = kr.getDay()

  let start = new Date(kr)

  if (day === 0) {
    // 📌 오늘이 일요일이면 내일부터 시작
    start.setDate(kr.getDate() + 1)
  } else {
    // 📌 오늘이 월~금이면 이번 주 월요일 기준 시작
    start.setDate(kr.getDate() - (day - 1))
  }

  const dates = []

  for (let i = 0; i < 5; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)

    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')

    dates.push({ key: `${y}${m}${dd}`, label: `${m}/${dd}` })
  }

  return dates
}

export default function WeeklyMealPage() {
  const [darkMode, setDarkMode] = useState(false)

  const [weekMeals, setWeekMeals] = useState<
    { date: string; label: string; meal: string[] | null }[]
  >([])

  const [eduCode, setEduCode] = useState<string | null>(null)
  const [schoolCode, setSchoolCode] = useState<string | null>(null)

  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  const todayKey = (() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}${m}${d}`
  })()

  const [ready, setReady] = useState(false)

  // 🔹 1) 저장 정보 불러오기
  useEffect(() => {
    const storedEdu = localStorage.getItem('eduCode')
    const storedCode = localStorage.getItem('schoolCode')

    setEduCode(storedEdu ?? 'J10')
    setSchoolCode(storedCode ?? '7580167')

    setReady(true) // ⭐ storage 로딩 완료 표시
  }, [])

  // 🔹 2) 급식 불러오기 (storage 값 준비된 후 실행)
  useEffect(() => {
    if (!ready || !eduCode || !schoolCode) return

    const dates = getWeekDates()

    Promise.all(
      dates.map(async (d) => {
        const res = await fetch(
          `/api/meals?date=${d.key}&eduCode=${eduCode}&schoolCode=${schoolCode}`,
        )
        const data = await res.json()
        return { date: d.key, label: d.label, meal: data.meal }
      }),
    ).then(setWeekMeals)
  }, [ready, eduCode, schoolCode])

  // 🌙 다크모드 초기 로드
  useEffect(() => {
    const loadTheme = () => {
      try {
        const userRaw = localStorage.getItem('loggedInUser')
        if (!userRaw) {
          setDarkMode(false)
          return
        }

        const user = JSON.parse(userRaw)
        if (!user?.id) {
          setDarkMode(false)
          return
        }

        const raw = localStorage.getItem(`theme_settings_${user.id}`)
        if (!raw) {
          setDarkMode(false)
          return
        }

        const parsed = JSON.parse(raw)
        setDarkMode(!!parsed.darkMode)
      } catch {
        setDarkMode(false)
      }
    }

    loadTheme()

    window.addEventListener('storage', loadTheme)

    return () => {
      window.removeEventListener('storage', loadTheme)
    }
  }, [])

  // 🌙 내정보에서 토글 시 반영
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      if (!e?.detail) return
      setDarkMode(!!e.detail.darkMode)
    }

    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  useEffect(() => {
    if (!weekMeals.length) return

    const index = weekMeals.findIndex((d) => d.date === todayKey)
    if (index === -1) return

    const el = itemRefs.current[index]
    if (!el) return

    el.scrollIntoView({
      behavior: 'smooth',
      inline: 'center', // 🔥 핵심
      block: 'nearest',
    })
  }, [weekMeals])

  return (
    <div
      style={{
        minHeight: '250px',
        marginBottom: '32px',
        padding: '20px',
        background: darkMode ? '#0f172a' : '#F3FAFF',
        borderRadius: '16px',
        boxShadow: darkMode
          ? '0 2px 8px rgba(0,0,0,0.4)'
          : '0 2px 8px rgba(0,0,0,0.05)',

        /* 모바일 화면 조건 */
        maxWidth: '1500px',
        margin: '0 auto',
      }}
    >
      {/* 제목 */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: darkMode ? '#7dd3fc' : '#4FC3F7',
          borderBottom: darkMode ? '2px solid #7dd3fc' : '2px solid #4FC3F7',
          paddingBottom: '6px',
          marginBottom: '16px',
        }}
      >
        🍱 이번 주 급식
      </h3>
      <style>
        {`
    /* --------------------------- */
    /*   🔥 모바일 최적화 (5칸 가로 스크롤) */
    /* --------------------------- */
    @media (max-width: 480px) {

      /* 모바일일 때는 flex row + scroll */
      .meal-grid {
        display: flex !important;
        flex-direction: row !important;
        overflow-x: auto !important;
        gap: 10px !important;
        padding-bottom: 8px !important;
        scrollbar-width: none;       /* Firefox */
      }

      .meal-grid::-webkit-scrollbar {
        display: none; /* Chrome/Safari */
      }

      /* 각 급식 카드 고정 너비 */
      .meal-card {
        min-width: 305px !important;
        max-width: 305px !important;
        flex-shrink: 0 !important;
        padding: 12px !important;
        border-radius: 12px !important;
      }

      .meal-date {
        font-size: 15px !important;
        margin-bottom: 4px !important;
      }

      .meal-ul {
        font-size: 14px !important;  
        adding-left: 14px !important;
        line-height: 1.5 !important; 
      }

      h3 {
        font-size: 16px !important;
      }
    }
  `}
      </style>

      {/* 리스트 */}
      <div
        className="meal-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {weekMeals.map((d, idx) => (
          <div
            key={idx}
            ref={(el) => {
              itemRefs.current[idx] = el
            }}
            className="meal-card"
            style={{
              background: darkMode ? '#1e293b' : 'white',
              borderRadius: '12px',
              padding: '12px',
              border: darkMode ? '1px solid #334155' : '1px solid #E1F5FE',
              boxShadow: darkMode
                ? '0 2px 6px rgba(0,0,0,0.5)'
                : '0 2px 6px rgba(0,0,0,0.05)',
              minHeight: '140px',
            }}
          >
            <div
              className="meal-date"
              style={{
                fontWeight: 700,
                color: darkMode ? '#93c5fd' : '#0288D1',
                marginBottom: '6px',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {d.label}
            </div>

            {!d.meal && (
              <p
                style={{
                  fontSize: '12px',
                  color: darkMode ? '#94a3b8' : '#777',
                  textAlign: 'center',
                }}
              >
                급식 없음
              </p>
            )}

            {d.meal && (
              <ul
                className="meal-ul"
                style={{
                  margin: 0,
                  paddingLeft: '14px',
                  lineHeight: 1.35,
                  fontSize: '13px',
                }}
              >
                {d.meal.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
