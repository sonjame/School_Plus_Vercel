'use client'

import { useState, useEffect, FormEvent, MouseEvent } from 'react'

type DayCell = {
  day: number | null
  key: string | null
}

type TimeMemo = {
  start: string
  end: string
  text: string
}

type MemoMap = Record<string, TimeMemo[]>

type Holiday = {
  date: string // "YYYY-MM-DD"
  name: string // 예: "추석", "어린이날"
}

type Period = {
  id: number
  label: string // 예: "수행평가 기간", "중간고사 기간"
  start: string // "YYYY-MM-DD"
  end: string // "YYYY-MM-DD"
  color: string // 기간 표시 선 색상
}

type CalendarEvent = {
  date: string // "YYYY-MM-DD"
  title: string // 일정 제목
}

// 🔐 localStorage 키 모음 (HomePage와 맞추기)
const STORAGE_KEYS = {
  memos: 'calendar_memos',
  colors: 'calendar_colors',
  titles: 'calendar_titles',
  contents: 'calendar_contents',
  periods: 'calendar_periods',
  events: 'calendarEvents', // Home 페이지에서 읽는 키

  // ✅ 뷰 상태 유지용 키
  viewYear: 'calendar_view_year',
  viewMonth: 'calendar_view_month',
  selectedDate: 'calendar_selected_date',
  contextDate: 'calendar_context_date',
}

// 📦 날짜 메모/기간 → Home에서 사용할 events 배열로 변환
function buildCalendarEvents(
  dateNoteTitles: Record<string, string>,
  dateNoteContents: Record<string, string[]>,
  periods: Period[]
): CalendarEvent[] {
  const map: Record<string, string[]> = {}

  // 1) 날짜 메모 제목
  for (const [date, title] of Object.entries(dateNoteTitles)) {
    const t = title.trim()
    if (!t) continue
    if (!map[date]) map[date] = []
    map[date].push(t)
  }

  // 2) 날짜 메모 내용
  for (const [date, list] of Object.entries(dateNoteContents)) {
    for (const raw of list) {
      const t = raw.trim()
      if (!t) continue
      if (!map[date]) map[date] = []
      map[date].push(t)
    }
  }

  // 3) 기간 (시작일 기준으로만 넣음)
  for (const p of periods) {
    const t = p.label.trim()
    if (!t || !p.start) continue
    if (!map[p.start]) map[p.start] = []
    if (!map[p.start].includes(t)) map[p.start].push(t)
  }

  const events: CalendarEvent[] = []
  for (const [date, titles] of Object.entries(map)) {
    const uniq = Array.from(new Set(titles))
    for (const t of uniq) {
      events.push({ date, title: t })
    }
  }
  return events
}

function getHolidayFromMap(
  holidayMap: Record<string, Holiday>,
  dateKey: string | null
): Holiday | undefined {
  if (!dateKey) return undefined
  return holidayMap[dateKey]
}

export default function CalendarPage() {
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0 ~ 11
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [contextDate, setContextDate] = useState<string | null>(null)

  const [memos, setMemos] = useState<MemoMap>({})
  const [customColors, setCustomColors] = useState<Record<string, string>>({})

  const [dateNoteTitles, setDateNoteTitles] = useState<Record<string, string>>(
    {}
  )
  const [dateNoteContents, setDateNoteContents] = useState<
    Record<string, string[]>
  >({})

  const [periods, setPeriods] = useState<Period[]>([])

  const [holidayMap, setHolidayMap] = useState<Record<string, Holiday>>({})
  const [holidayLoading, setHolidayLoading] = useState(false)

  // 🔑 localStorage 로드 완료 여부
  const [loaded, setLoaded] = useState(false)

  // 🟣 새 일정 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalStartDate, setModalStartDate] = useState<string>('')
  const [modalEndDate, setModalEndDate] = useState<string>('')
  const [modalRangeType, setModalRangeType] = useState<'single' | 'range'>(
    'single'
  )
  const [modalUseTime, setModalUseTime] = useState<boolean>(false)
  const [modalUsePeriod, setModalUsePeriod] = useState<boolean>(false)
  const [modalTime, setModalTime] = useState<string>('')
  const [modalDescription, setModalDescription] = useState<string>('')

  // 오늘 날짜 키
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // ✅ 페이지 처음 들어올 때 localStorage에서 일정 + 뷰 상태 로드
  useEffect(() => {
    try {
      // 🧭 뷰 상태 복원 (연/월/선택날짜/컨텍스트 날짜)
      const savedYear = localStorage.getItem(STORAGE_KEYS.viewYear)
      const savedMonth = localStorage.getItem(STORAGE_KEYS.viewMonth)
      const savedSelectedDate = localStorage.getItem(STORAGE_KEYS.selectedDate)
      const savedContextDate = localStorage.getItem(STORAGE_KEYS.contextDate)

      if (savedYear && !Number.isNaN(parseInt(savedYear, 10))) {
        setYear(parseInt(savedYear, 10))
      }
      if (savedMonth && !Number.isNaN(parseInt(savedMonth, 10))) {
        setMonth(parseInt(savedMonth, 10))
      }
      if (savedSelectedDate) {
        setSelectedDate(savedSelectedDate)
      }
      if (savedContextDate) {
        setContextDate(savedContextDate)
      }

      // 🗂 일정 관련 데이터들 복원
      const savedMemos = localStorage.getItem(STORAGE_KEYS.memos)
      const savedColors = localStorage.getItem(STORAGE_KEYS.colors)
      const savedTitles = localStorage.getItem(STORAGE_KEYS.titles)
      const savedContents = localStorage.getItem(STORAGE_KEYS.contents)
      const savedPeriods = localStorage.getItem(STORAGE_KEYS.periods)

      if (savedMemos) setMemos(JSON.parse(savedMemos))
      if (savedColors) setCustomColors(JSON.parse(savedColors))
      if (savedTitles) setDateNoteTitles(JSON.parse(savedTitles))
      if (savedContents) setDateNoteContents(JSON.parse(savedContents))
      if (savedPeriods) setPeriods(JSON.parse(savedPeriods))
    } catch (e) {
      console.warn('캘린더 데이터 로드 중 오류:', e)
    } finally {
      // ✅ 로드 완료 플래그
      setLoaded(true)
    }
  }, [])

  // ✅ 메모/색상/기간이 바뀔 때마다 localStorage에 저장 + Home용 events 생성
  useEffect(() => {
    if (!loaded) return

    try {
      localStorage.setItem(STORAGE_KEYS.memos, JSON.stringify(memos))
      localStorage.setItem(STORAGE_KEYS.colors, JSON.stringify(customColors))
      localStorage.setItem(STORAGE_KEYS.titles, JSON.stringify(dateNoteTitles))
      localStorage.setItem(
        STORAGE_KEYS.contents,
        JSON.stringify(dateNoteContents)
      )
      localStorage.setItem(STORAGE_KEYS.periods, JSON.stringify(periods))

      const events = buildCalendarEvents(
        dateNoteTitles,
        dateNoteContents,
        periods
      )
      localStorage.setItem(STORAGE_KEYS.events, JSON.stringify(events))
    } catch (e) {
      console.warn('캘린더 데이터 저장 중 오류:', e)
    }
  }, [memos, customColors, dateNoteTitles, dateNoteContents, periods, loaded])

  // ✅ 연/월/선택 날짜/컨텍스트 날짜 바뀔 때마다 뷰 상태 저장
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.viewYear, String(year))
      localStorage.setItem(STORAGE_KEYS.viewMonth, String(month))

      if (selectedDate) {
        localStorage.setItem(STORAGE_KEYS.selectedDate, selectedDate)
      } else {
        localStorage.removeItem(STORAGE_KEYS.selectedDate)
      }

      if (contextDate) {
        localStorage.setItem(STORAGE_KEYS.contextDate, contextDate)
      } else {
        localStorage.removeItem(STORAGE_KEYS.contextDate)
      }
    } catch (e) {
      console.warn('캘린더 뷰 상태 저장 중 오류:', e)
    }
  }, [year, month, selectedDate, contextDate])

  // 🔄 연도 바뀔 때 한국 공휴일 API에서 가져오기
  useEffect(() => {
    let cancelled = false

    async function loadHolidays() {
      try {
        setHolidayLoading(true)
        const res = await fetch(`/api/holidays?year=${year}`)
        if (!res.ok) throw new Error('failed to fetch holidays')
        const data: Holiday[] = await res.json()

        if (cancelled) return

        const map: Record<string, Holiday> = {}
        for (const h of data) {
          map[h.date] = h
        }
        setHolidayMap(map)
      } catch (e) {
        console.error('공휴일 가져오기 실패:', e)
        setHolidayMap({})
      } finally {
        if (!cancelled) {
          setHolidayLoading(false)
        }
      }
    }

    loadHolidays()
    return () => {
      cancelled = true
    }
  }, [year])

  // 📅 달력 셀 만들기
  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const cells: DayCell[] = []
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, key: null })
  }
  for (let d = 1; d <= lastDate; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      d
    ).padStart(2, '0')}`
    cells.push({ day: d, key })
  }

  // 🔧 연/월 이동
  const handlePrevMonth = () => {
    let newYear = year
    let newMonth = month - 1
    if (newMonth < 0) {
      newMonth = 11
      newYear = year - 1
    }
    setYear(newYear)
    setMonth(newMonth)
    setSelectedDate(null)
    setContextDate(null)
  }

  const handleNextMonth = () => {
    let newYear = year
    let newMonth = month + 1
    if (newMonth > 11) {
      newMonth = 0
      newYear = year + 1
    }
    setYear(newYear)
    setMonth(newMonth)
    setSelectedDate(null)
    setContextDate(null)
  }

  const openScheduleModal = (dateKey: string) => {
    setSelectedDate(dateKey)
    setContextDate(dateKey)
    setModalStartDate(dateKey)
    setModalEndDate(dateKey)
    setModalRangeType('single')
    setModalUseTime(false)
    setModalUsePeriod(false)
    setModalTime('')
    setModalDescription('')
    setIsModalOpen(true)
  }

  const handleRightClickDay = (
    e: MouseEvent<HTMLButtonElement>,
    key: string | null
  ) => {
    e.preventDefault()
    if (!key) return
    openScheduleModal(key)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleModalSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!modalStartDate) {
      alert('시작일을 선택하세요.')
      return
    }
    if (!modalDescription.trim()) {
      alert('설명을 입력하세요.')
      return
    }

    const start = modalStartDate
    const end =
      modalRangeType === 'range' && modalEndDate ? modalEndDate : modalStartDate

    // 설명을 해당 날짜의 제목으로 저장 → 홈 D-Day에 사용
    setDateNoteTitles((prev) => ({
      ...prev,
      [start]: modalDescription.trim(),
    }))

    // 시간 선택 시 시간 메모도 저장 (선택사항)
    if (modalUseTime && modalTime) {
      setMemos((prev) => {
        const list = prev[start] ?? []
        const newList: TimeMemo[] = [
          ...list,
          { start: modalTime, end: modalTime, text: modalDescription.trim() },
        ]
        newList.sort((a, b) =>
          a.start < b.start ? -1 : a.start > b.start ? 1 : 0
        )
        return { ...prev, [start]: newList }
      })
    }

    // 기간 설정일 경우 기간 정보도 추가
    if (modalRangeType === 'range' && start && end && start <= end) {
      setPeriods((prev) => [
        ...prev,
        {
          id: Date.now(),
          label: modalDescription.trim(),
          start,
          end,
          color: '#7c3aed', // 기본 보라색 기간 라인 (원 코드 유지)
        },
      ])
    }

    setIsModalOpen(false)
  }

  // 🔴 일정(이 날짜의 데이터) 전체 삭제
  const handleDeleteScheduleForDate = () => {
    // 모달에서 바꾼 시작일이 있으면 그걸 기준으로, 없으면 선택된 날짜 기준으로 삭제
    const dateKey = modalStartDate || selectedDate
    if (!dateKey) return

    const ok = window.confirm('이 날짜의 모든 일정을 삭제할까요?')
    if (!ok) return

    // 날짜 메모 제목 삭제
    setDateNoteTitles((prev) => {
      const next = { ...prev }
      delete next[dateKey]
      return next
    })

    // 날짜 메모 내용 삭제
    setDateNoteContents((prev) => {
      const next = { ...prev }
      delete next[dateKey]
      return next
    })

    // 시간 메모 삭제
    setMemos((prev) => {
      const next = { ...prev }
      delete next[dateKey]
      return next
    })

    // 날짜 색상 초기화
    setCustomColors((prev) => {
      const next = { ...prev }
      delete next[dateKey]
      return next
    })

    // 이 날짜가 포함된 기간(시작일~종료일 범위에 들어가는 것) 전부 삭제
    setPeriods((prev) =>
      prev.filter((p) => !(p.start <= dateKey && dateKey <= p.end))
    )

    setIsModalOpen(false)
  }

  const cellsWithRender = cells // 그냥 가독성용 별칭

  return (
    <div className="page-wrapper">
      <main className="main-section">
        <div className="calendar-column">
          <div className="card">
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              캘린더
            </h2>
            <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
              오늘: {todayKey}
            </p>
            {holidayLoading && (
              <p style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                공휴일 불러오는 중...
              </p>
            )}
          </div>

          {/* ⬇⬇⬇ 캘린더 화면 부분 ⬇⬇⬇ */}
          <div className="card calendar-card">
            <div className="calendar-header-row">
              <button
                className="month-nav-btn"
                type="button"
                onClick={handlePrevMonth}
              >
                ◀
              </button>
              <h3 className="calendar-title">
                {year}년 {month + 1}월
              </h3>
              <button
                className="month-nav-btn"
                type="button"
                onClick={handleNextMonth}
              >
                ▶
              </button>
            </div>

            <div className="calendar-weekdays">
              <div className="weekday sun">일</div>
              <div className="weekday">월</div>
              <div className="weekday">화</div>
              <div className="weekday">수</div>
              <div className="weekday">목</div>
              <div className="weekday">금</div>
              <div className="weekday sat">토</div>
            </div>

            <div className="calendar-grid">
              {cellsWithRender.map((cell, index) => {
                if (cell.day === null) {
                  return <div key={index} className="day-cell empty" />
                }

                const weekdayIndex = index % 7
                const isSun = weekdayIndex === 0
                const isSat = weekdayIndex === 6

                const holidayInfo = getHolidayFromMap(holidayMap, cell.key)
                const isHoliday = !!holidayInfo

                const isSelected = selectedDate === cell.key
                const isToday = cell.key === todayKey

                const customColor = cell.key
                  ? customColors[cell.key]
                  : undefined

                const periodsForDay = cell.key
                  ? periods.filter(
                      (p) =>
                        p.start <= (cell.key as string) &&
                        (cell.key as string) <= p.end
                    )
                  : []
                const firstPeriodForDay = periodsForDay[0]
                const isInPeriod = periodsForDay.length > 0

                let dayStyle:
                  | { background?: string; borderColor?: string }
                  | undefined

                if (customColor) {
                  dayStyle = !isSelected
                    ? {
                        background: customColor,
                        borderColor: customColor,
                      }
                    : { background: customColor }
                }

                const hasTimeMemo =
                  !!cell.key && !!memos[cell.key] && memos[cell.key].length > 0

                const hasDateNote =
                  !!cell.key &&
                  ((dateNoteTitles[cell.key] &&
                    dateNoteTitles[cell.key].trim() !== '') ||
                    (dateNoteContents[cell.key] &&
                      dateNoteContents[cell.key].length > 0))

                const hasAnyNote = hasTimeMemo || hasDateNote

                const dateTitle =
                  cell.key && dateNoteTitles[cell.key]
                    ? dateNoteTitles[cell.key].trim()
                    : ''

                const dayClassNames = [
                  'day-cell',
                  isSun && 'sun',
                  isSat && 'sat',
                  isHoliday && 'holiday',
                  isToday && 'today',
                  isSelected && 'selected',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={index}
                    type="button"
                    className={dayClassNames}
                    style={dayStyle}
                    onClick={() => {
                      if (cell.key) {
                        openScheduleModal(cell.key)
                      }
                    }}
                    onContextMenu={(e) => handleRightClickDay(e, cell.key)}
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        paddingTop: 6,
                        paddingInline: 4,
                        boxSizing: 'border-box',
                      }}
                    >
                      {isToday && <span className="today-badge">오늘</span>}

                      <span className="day-number">{cell.day}</span>

                      {holidayInfo && (
                        <div className="holiday-cell-name">
                          {holidayInfo.name}
                        </div>
                      )}

                      {dateTitle && (
                        <div className="day-title">{dateTitle}</div>
                      )}

                      {firstPeriodForDay && (
                        <div className="period-tag">
                          <span className="period-tag-label">
                            {firstPeriodForDay.label}
                          </span>
                        </div>
                      )}

                      {hasAnyNote && <span className="memo-dot" />}

                      {isInPeriod && firstPeriodForDay && (
                        <div
                          className="period-line"
                          style={{ background: firstPeriodForDay.color }}
                        />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          {/* ⬆⬆⬆ 캘린더 화면 부분 끝 ⬆⬆⬆ */}
        </div>
      </main>

      {/* 🟢 새 일정 추가 모달 (심플 버전) */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleModalClose}>
          <div
            className="modal-panel"
            onClick={(e) => {
              e.stopPropagation()
            }}
          >
            <div className="modal-header">
              <span className="modal-title">새 일정 추가</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleModalClose}
              >
                ×
              </button>
            </div>

            <form className="modal-body" onSubmit={handleModalSubmit}>
              {/* 시작일 */}
              <div className="modal-field">
                <label className="modal-label">시작일</label>
                <input
                  type="date"
                  className="modal-input"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                />
              </div>

              {/* 기간 설정 */}
              <div className="modal-field">
                <label className="modal-label">기간 설정</label>
                <div className="modal-radio-row">
                  <label className="modal-radio">
                    <input
                      type="radio"
                      checked={modalRangeType === 'single'}
                      onChange={() => setModalRangeType('single')}
                    />
                    <span>하루</span>
                  </label>
                  <label className="modal-radio">
                    <input
                      type="radio"
                      checked={modalRangeType === 'range'}
                      onChange={() => setModalRangeType('range')}
                    />
                    <span>기간 설정</span>
                  </label>
                </div>
                {modalRangeType === 'range' && (
                  <input
                    type="date"
                    className="modal-input modal-range-end"
                    value={modalEndDate}
                    onChange={(e) => setModalEndDate(e.target.value)}
                  />
                )}
              </div>

              {/* 시간 / 교시 선택 토글 */}
              <div className="modal-field">
                <label className="modal-label">시간 설정</label>
                <div className="modal-radio-row">
                  <button
                    type="button"
                    className={'modal-toggle ' + (modalUseTime ? 'active' : '')}
                    onClick={() => {
                      setModalUseTime(true)
                      setModalUsePeriod(false)
                    }}
                  >
                    시간
                  </button>
                  <button
                    type="button"
                    className={
                      'modal-toggle ' + (modalUsePeriod ? 'active' : '')
                    }
                    onClick={() => {
                      setModalUsePeriod(true)
                      setModalUseTime(false)
                    }}
                  >
                    교시
                  </button>
                </div>
              </div>

              {/* 시간 입력 (선택) */}
              <div className="modal-field">
                <label className="modal-label">시간 (선택)</label>
                <input
                  type="time"
                  className="modal-input"
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                  disabled={!modalUseTime}
                />
              </div>

              {/* 설명 */}
              <div className="modal-field">
                <label className="modal-label">설명</label>
                <textarea
                  className="modal-textarea"
                  placeholder="일정 설명을 입력하세요"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                />
              </div>

              {/* 추가 버튼 */}
              <button type="submit" className="modal-submit-btn">
                일정 추가
              </button>

              {/* 삭제 버튼 */}
              <button
                type="button"
                className="modal-delete-btn"
                onClick={handleDeleteScheduleForDate}
              >
                이 날짜의 일정 전체 삭제
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ⬇ 스타일 ⬇ */}
      <style jsx>{`
        .page-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #f5f7fb;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
            sans-serif;
        }

        .main-section {
          flex: 1;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 80px;
          padding-bottom: 40px;
          box-sizing: border-box;
          width: 100%;
        }

        .calendar-column {
          width: 100%;
          max-width: 900px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin: 0 auto;
        }

        .card {
          width: 100%;
          border: 1px solid #dedede;
          border-radius: 14px;
          padding: 18px 20px;
          background: #ffffff;
          box-sizing: border-box;
        }

        .calendar-card {
          padding-top: 16px;
        }

        .calendar-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .calendar-title {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
        }

        .month-nav-btn {
          border: none;
          background: #f2f2f2;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        }

        .month-nav-btn:hover {
          background: #e5e5e5;
        }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-weight: 600;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .weekday {
          padding: 4px 0;
        }

        .weekday.sun {
          color: #e53935;
        }

        .weekday.sat {
          color: #1e88e5;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 14px;
        }

        .day-cell {
          height: 80px;
          border-radius: 12px;
          border: 1px solid #dedede;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          box-sizing: border-box;
        }

        .day-cell.sun,
        .day-cell.holiday {
          color: #e53935;
          background: rgba(255, 0, 0, 0.08);
          border-color: rgba(255, 0, 0, 0.15);
        }

        .day-cell.sat {
          color: #1e88e5;
          background: rgba(30, 136, 229, 0.08);
          border-color: rgba(30, 136, 229, 0.15);
        }

        .day-cell.today:not(.selected) {
          border-color: #111827;
          border-width: 2px;
        }

        .day-cell.selected {
          border: 2px solid #000000;
        }

        .day-cell.empty {
          border: none;
          background: transparent;
          cursor: default;
        }

        .day-number {
          font-size: 16px;
          font-weight: 500;
        }

        .today-badge {
          position: absolute;
          top: 4px;
          right: 6px;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
        }

        .holiday-cell-name {
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.2;
          color: #c62828;
          font-weight: 600;
          text-align: center;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .day-title {
          margin-top: 4px;
          font-size: 10px;
          line-height: 1.2;
          color: #555555;
          text-align: center;
          width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .memo-dot {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: #27a9ff;
          border-radius: 50%;
        }

        .period-tag {
          margin-top: 2px;
          font-size: 9px;
          line-height: 1.2;
          color: #856404;
          background: rgba(255, 243, 205, 0.95);
          border-radius: 999px;
          padding: 1px 6px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          border: 1px solid #ffeeba;
        }

        .period-line {
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 70%;
          height: 3px;
          border-radius: 999px;
        }

        /* 🟢 모달 스타일 (심플/기본 팝업 느낌) */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-panel {
          width: 360px;
          max-width: 92%;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
          overflow: hidden;
        }

        .modal-header {
          padding: 10px 14px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f9fafb;
        }

        .modal-title {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .modal-close-btn {
          border: none;
          background: transparent;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-close-btn:hover {
          color: #111827;
        }

        .modal-body {
          padding: 14px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #ffffff;
        }

        .modal-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .modal-label {
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        .modal-input {
          border-radius: 6px;
          border: 1px solid #d1d5db;
          padding: 7px 9px;
          font-size: 12px;
          outline: none;
          background: #ffffff;
        }

        .modal-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
        }

        .modal-range-end {
          margin-top: 4px;
        }

        .modal-radio-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 2px;
          flex-wrap: wrap;
        }

        .modal-radio {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #4b5563;
        }

        .modal-radio input {
          accent-color: #2563eb;
        }

        .modal-toggle {
          border-radius: 999px;
          border: 1px solid #d1d5db;
          padding: 5px 12px;
          font-size: 12px;
          background: #ffffff;
          cursor: pointer;
          min-width: 60px;
        }

        .modal-toggle.active {
          background: #e5f0ff;
          border-color: #2563eb;
          color: #1d4ed8;
          font-weight: 600;
        }

        .modal-textarea {
          border-radius: 6px;
          border: 1px solid #d1d5db;
          padding: 8px 9px;
          font-size: 12px;
          min-height: 70px;
          resize: none;
          outline: none;
          background: #ffffff;
        }

        .modal-textarea:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.15);
        }

        .modal-submit-btn {
          margin-top: 6px;
          border: none;
          width: 100%;
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          cursor: pointer;
          background: #2563eb;
        }

        .modal-submit-btn:hover {
          background: #1d4ed8;
        }

        .modal-delete-btn {
          margin-top: 4px;
          border: none;
          width: 100%;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #b91c1c;
          cursor: pointer;
          background: #fee2e2;
        }

        .modal-delete-btn:hover {
          background: #fecaca;
        }

        @media (max-width: 768px) {
          .main-section {
            padding-top: 40px;
            padding-bottom: 24px;
          }

          .calendar-column {
            max-width: 100%;
            padding: 0 12px;
          }
        }
      `}</style>
    </div>
  )
}
