'use client'

import { useEffect, useState } from 'react'

// ---------------------------
//  이번 주 날짜 구하기
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
  const [weekMeals, setWeekMeals] = useState<
    { date: string; label: string; meal: string[] | null }[]
  >([])

  const [eduCode, setEduCode] = useState<string | null>(null)
  const [schoolCode, setSchoolCode] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  // 🔹 저장된 학교 정보 불러오기
  useEffect(() => {
    const storedEdu = localStorage.getItem('eduCode')
    const storedCode = localStorage.getItem('schoolCode')

    setEduCode(storedEdu ?? 'J10')
    setSchoolCode(storedCode ?? '7580167')

    setReady(true)
  }, [])

  // 🔹 아이콘 폰트 로드 보장 (아이콘 깨짐 방지)
  useEffect(() => {
    const iconLink = document.createElement('link')
    iconLink.rel = 'stylesheet'
    iconLink.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined'
    document.head.appendChild(iconLink)
  }, [])

  // 🔹 저장된 값 준비 후 급식 로드
  useEffect(() => {
    if (!ready || !eduCode || !schoolCode) return

    const dates = getWeekDates()

    Promise.all(
      dates.map(async (d) => {
        const res = await fetch(
          `/api/meals?date=${d.key}&eduCode=${eduCode}&schoolCode=${schoolCode}`
        )
        const data = await res.json()
        return { date: d.key, label: d.label, meal: data.meal }
      })
    ).then((results) => {
      setWeekMeals(results)
    })
  }, [ready, eduCode, schoolCode])

  return (
    <div
      style={{
        marginBottom: '32px',
        padding: '20px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <h3
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#4FC3F7',
          paddingBottom: '6px',
          borderBottom: '2px solid #4FC3F7',
          marginBottom: '16px',
        }}
      >
        🍱 이번 주 점심 메뉴
      </h3>

      {/* 🔥 아이콘 폰트 스타일 */}
      <style>
        {`
        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 22px;
          display: inline-block;
          line-height: 1;
          vertical-align: middle;
        }
      `}
      </style>

      <div style={{ display: 'grid', gap: '16px' }}>
        {weekMeals.map((d, idx) => (
          <div
            key={idx}
            style={{
              padding: '18px',
              borderRadius: '14px',
              background: '#E3F2FD',
              color: '#222',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid #BBDEFB',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  background: '#BBDEFB',
                  padding: '6px',
                  borderRadius: '8px',
                  color: '#1A237E',
                }}
              >
                calendar_month
              </span>

              <span
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#0D47A1',
                }}
              >
                {d.label}
              </span>
            </div>

            {!d.meal ? (
              <p style={{ opacity: 0.85, fontSize: 15 }}>급식 정보 없음</p>
            ) : (
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '18px',
                  fontSize: '15px',
                  lineHeight: 1.6,
                  color: '#222',
                }}
              >
                {d.meal.map((m, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
