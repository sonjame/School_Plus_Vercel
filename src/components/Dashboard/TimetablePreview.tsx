'use client'
import { useState, useEffect } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'

type ClassPeriod = {
  day: string
  period: number
  subject: string
  teacher: string
  room: string
}

const subjectColors: Record<string, string> = {
  국어: '#FFCDD2',
  수학: '#BBDEFB',
  영어: '#C8E6C9',
  과학: '#D1C4E9',
  사회: '#FFE0B2',
  체육: '#B3E5FC',
  음악: '#F8BBD0',
  미술: '#DCEDC8',
  자율: '#FFF9C4',
  default: '#F5F5F5',
}

function getSavedTerm(): { year: number; semester: '1학기' | '2학기' } {
  const raw = localStorage.getItem('current_timetable_term')
  if (!raw) {
    const now = new Date()
    const month = now.getMonth() + 1
    return {
      year: now.getFullYear(),
      semester: month >= 3 && month <= 8 ? '1학기' : '2학기',
    }
  }
  return JSON.parse(raw)
}

export default function TimetablePreview() {
  const days = ['월', '화', '수', '목', '금']
  const todayIndex = new Date().getDay() // 0(일)~6(토)
  const [selectedDay, setSelectedDay] = useState(days[todayIndex - 1] || '월')
  const [timetable, setTimetable] = useState<ClassPeriod[]>([])

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('theme_settings')
      if (raw) {
        const parsed = JSON.parse(raw)
        setDarkMode(!!parsed.darkMode)
      }
    } catch {}

    const handleThemeChange = (e: any) => {
      if (!e?.detail) return
      setDarkMode(!!e.detail.darkMode)
    }

    window.addEventListener('theme-change', handleThemeChange)
    return () => window.removeEventListener('theme-change', handleThemeChange)
  }, [])

  /* ✅ 서버에서 시간표 불러오기 */
  useEffect(() => {
    const load = async () => {
      try {
        const term = getSavedTerm()
        if (!term) return

        const res = await apiFetch(
          `/api/timetable?year=${term.year}&semester=${term.semester}`,
        )

        if (!res.ok) return

        const data = await res.json()
        if (!Array.isArray(data)) return

        setTimetable(data)
      } catch (e) {
        console.error('주간 시간표 로드 오류:', e)
        setTimetable([])
      }
    }

    load()
  }, [])

  /* ✅ 선택된 요일 필터링 */
  const filtered = timetable
    .filter((c) => c.day === selectedDay && c.subject?.trim())
    .sort((a, b) => a.period - b.period)

  return (
    <section style={{ marginBottom: '35px' }}>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#4FC3F7',
          borderBottom: '2px solid #4FC3F7',
          paddingBottom: '6px',
          marginBottom: '14px',
        }}
      >
        📆 주간 시간표
      </h3>

      {/* 요일 탭 */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: darkMode ? '1px solid #334155' : '1px solid #4FC3F7',
              backgroundColor:
                selectedDay === day
                  ? '#4FC3F7'
                  : darkMode
                    ? '#1e293b'
                    : 'white',
              color:
                selectedDay === day
                  ? 'white'
                  : darkMode
                    ? '#cbd5e1'
                    : '#0277BD',
              cursor: 'pointer',
              fontWeight: 600,
              transition: '0.2s',
            }}
          >
            {day}요일
          </button>
        ))}
      </div>

      {/* 시간표 내용 */}
      <div
        style={{
          backgroundColor: darkMode ? '#1e293b' : '#E1F5FE',
          borderRadius: '10px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
        }}
      >
        {filtered.length === 0 ? (
          <p style={{ color: darkMode ? '#cbd5e1' : '#777' }}>
            등록된 수업이 없습니다.
          </p>
        ) : (
          filtered.map((c, i) => {
            const colorKey = Object.keys(subjectColors).find((k) =>
              c.subject.includes(k),
            )
            const bg = colorKey
              ? subjectColors[colorKey]
              : subjectColors.default

            return (
              <div
                key={i}
                style={{
                  backgroundColor: bg,
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
          })
        )}
      </div>
    </section>
  )
}
