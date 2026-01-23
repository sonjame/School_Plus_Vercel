'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/* ===============================
   타입 정의
================================ */

type AcademicEvent = {
  date: string
  title: string
}

type DBEvent = {
  id: number
  title: string
  event_date: string
  description?: string
  start_time?: string
  end_time?: string
  color?: string
}

type AddMode = 'single' | 'range'

/* ===============================
   유틸
================================ */

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* ===============================
   메인 컴포넌트
================================ */

export default function CalendarPage() {
  const searchParams = useSearchParams()
  const queryDate = searchParams.get('date')

  const today = new Date()
  const todayKey = formatLocalDate(today)

  /* ===============================
     State
  ================================ */

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [contextDate, setContextDate] = useState<string | null>(null)

  const [userEvents, setUserEvents] = useState<Record<string, DBEvent[]>>({})
  const [academicEvents, setAcademicEvents] = useState<
    Record<string, AcademicEvent[]>
  >({})

  /** 🔥 일정 추가 모달 */
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [addMode, setAddMode] = useState<AddMode>('single')

  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  //모달 삭제 확인 디자인//
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DBEvent | null>(null)

  /* ===============================
     인증
  ================================ */

  const [userId, setUserId] = useState<number | null>(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('userId')
    if (raw) setUserId(Number(raw))
    setAuthReady(true)
  }, [])

  /* ===============================
     Query Date
  ================================ */

  useEffect(() => {
    if (!queryDate) return
    const [y, m, d] = queryDate.split('-').map(Number)
    if (!y || !m || !d) return

    setYear(y)
    setMonth(m - 1)
    setSelectedDate(queryDate)
    setContextDate(queryDate)
  }, [queryDate])

  /* ===============================
     내 일정 로드
  ================================ */

  async function loadUserEvents(uid = userId) {
    if (!uid) return
    const res = await fetch(`/api/calendar-events?userId=${uid}`)
    if (!res.ok) return

    const rows: DBEvent[] = await res.json()
    const map: Record<string, DBEvent[]> = {}

    rows.forEach((ev) => {
      const dateKey =
        typeof ev.event_date === 'string'
          ? ev.event_date.slice(0, 10)
          : formatLocalDate(new Date(ev.event_date))

      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push({ ...ev, event_date: dateKey })
    })

    setUserEvents(map)
  }

  useEffect(() => {
    if (userId) loadUserEvents()
  }, [userId])

  /* ===============================
     학사일정
  ================================ */

  useEffect(() => {
    if (!userId) return

    const eduCode = localStorage.getItem('eduCode')
    const schoolCode = localStorage.getItem('schoolCode')
    if (!eduCode || !schoolCode) return

    async function loadAcademic() {
      const res = await fetch(
        `/api/academic-events?eduCode=${eduCode}&schoolCode=${schoolCode}&year=${year}&month=${
          month + 1
        }`,
      )
      if (!res.ok) return

      const data: AcademicEvent[] = await res.json()
      const map: Record<string, AcademicEvent[]> = {}

      data.forEach((ev) => {
        if (!map[ev.date]) map[ev.date] = []
        map[ev.date].push(ev)
      })

      setAcademicEvents(map)
    }

    loadAcademic()
  }, [userId, year, month])

  /* ===============================
     일정 추가
  ================================ */

  async function addEvent() {
    if (!userId || !newTitle.trim()) return

    if (addMode === 'single') {
      if (!newDate) return

      await fetch('/api/calendar-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: newTitle,
          description: newDesc,
          start_time: newStartTime || null,
          end_time: newEndTime || null,
          color: newColor,
          event_date: newDate,
        }),
      })
    } else {
      if (!rangeStart || !rangeEnd) return

      const start = new Date(rangeStart)
      const end = new Date(rangeEnd)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        await fetch('/api/calendar-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            title: newTitle,
            description: newDesc,
            start_time: newStartTime || null,
            end_time: newEndTime || null,
            color: newColor,
            event_date: formatLocalDate(d),
          }),
        })
      }
    }

    setShowModal(false)
    loadUserEvents()
  }

  async function updateEvent() {
    if (!userId || !editTarget || !newTitle.trim()) return

    await fetch('/api/calendar-events', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editTarget.id, // ✅ 핵심
        userId,
        title: newTitle,
        description: newDesc,
        start_time: newStartTime || null,
        end_time: newEndTime || null,
        color: newColor,
        event_date: newDate,
      }),
    })

    setShowEditModal(false)
    setEditTarget(null)
    loadUserEvents()
  }

  async function deleteEvent(ev: DBEvent) {
    if (!userId) return

    const ok = confirm('이 일정을 삭제할까요?')
    if (!ok) return

    const res = await fetch(
      `/api/calendar-events?id=${ev.id}&userId=${userId}`,
      {
        method: 'DELETE',
      },
    )

    if (!res.ok) {
      alert('삭제 실패')
      return
    }

    setShowEditModal(false)
    setEditTarget(null)
    loadUserEvents()
  }

  async function confirmDelete() {
    if (!userId || !deleteTarget) return

    const res = await fetch(
      `/api/calendar-events?id=${deleteTarget.id}&userId=${userId}`,
      { method: 'DELETE' },
    )

    if (!res.ok) {
      alert('삭제 실패')
      return
    }

    setShowDeleteModal(false)
    setDeleteTarget(null)
    loadUserEvents()
  }

  const [newDate, setNewDate] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [newColor, setNewColor] = useState('#4f46e5')

  /* ===============================
     수정 기능
  ================================ */
  const [editTarget, setEditTarget] = useState<DBEvent | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  /* ===============================
     인증 가드
  ================================ */

  if (!authReady) return null
  if (!userId) return <div>로그인이 필요합니다.</div>

  /* ===============================
     달력 계산
  ================================ */

  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const cells: { day: number | null; key: string | null }[] = []

  for (let i = 0; i < firstDay; i++) cells.push({ day: null, key: null })
  for (let d = 1; d <= lastDate; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      d,
    ).padStart(2, '0')}`
    cells.push({ day: d, key })
  }

  const changeMonth = (diff: number) => {
    const newDate = new Date(year, month + diff, 1)
    setYear(newDate.getFullYear())
    setMonth(newDate.getMonth())
  }

  /* ===============================
     색깔 버튼
  ================================ */

  const COLOR_PALETTE = [
    '#4f46e5', // indigo
    '#0ea5e9', // sky
    '#10b981', // emerald
    '#22c55e', // green
    '#eab308', // yellow
    '#f97316', // orange
    '#ef4444', // red
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#64748b', // slate
  ]

  /* ===============================
     JSX
  ================================ */

  return (
    <div className="page-wrapper">
      <div className="main-layout">
        <div className="calendar-area">
          <div className="month-header">
            <button className="nav-btn" onClick={() => changeMonth(-1)}>
              ◀
            </button>
            <div className="month-title">
              {year}년 {month + 1}월
            </div>
            <button className="nav-btn" onClick={() => changeMonth(1)}>
              ▶
            </button>
          </div>

          <div className="weekday-row">
            <div className="w sun">일</div>
            <div className="w">월</div>
            <div className="w">화</div>
            <div className="w">수</div>
            <div className="w">목</div>
            <div className="w">금</div>
            <div className="w sat">토</div>
          </div>

          <div className="grid-calendar">
            {cells.map((cell, idx) => {
              if (!cell.day) return <div key={idx} className="cell empty" />

              const isToday = cell.key === todayKey
              const isSelected = cell.key === selectedDate
              const hasUserEvent = !!userEvents[cell.key || '']
              const academicList = academicEvents[cell.key || ''] || []

              return (
                <div
                  key={cell.key}
                  className={`cell ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDate(cell.key)
                    setContextDate(cell.key)
                  }}
                >
                  <div className="cell-date">{cell.day}</div>
                  {isToday && <div className="today-badge">오늘</div>}
                  {hasUserEvent && <div className="dot" />}
                  {academicList.map((ev, i) => (
                    <div key={i} className="cell-academic">
                      {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽 패널 */}
        <div className="right-panel">
          {contextDate ? (
            <>
              <div className="rp-date">{contextDate}</div>

              <button
                className="add-btn"
                onClick={() => {
                  setAddMode('single')

                  setNewDate(contextDate!)
                  setRangeStart(contextDate!)
                  setRangeEnd(contextDate!)

                  setNewTitle('')
                  setNewDesc('')
                  setNewStartTime('')
                  setNewEndTime('')
                  setNewColor('#4f46e5')

                  setShowModal(true)
                }}
              >
                + 일정 추가
              </button>

              <div className="rp-section-title">내 일정</div>
              {userEvents[contextDate]?.length ? (
                userEvents[contextDate].map((ev) => (
                  <div
                    key={ev.id}
                    className="event-card"
                    style={{ borderLeftColor: ev.color || '#4f46e5' }}
                  >
                    <div className="event-header">
                      <div className="event-title">{ev.title}</div>

                      <div className="event-actions">
                        <button
                          className="edit-btn"
                          onClick={() => {
                            setEditTarget(ev)
                            setNewDate(ev.event_date)
                            setNewTitle(ev.title)
                            setNewDesc(ev.description || '')
                            setNewStartTime(ev.start_time || '')
                            setNewEndTime(ev.end_time || '')
                            setNewColor(ev.color || '#4f46e5')
                            setShowEditModal(true)
                          }}
                        >
                          수정
                        </button>

                        <button
                          className="edit-btn delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(ev)
                            setShowDeleteModal(true)
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {ev.start_time && (
                      <div className="event-time">
                        ⏰ {ev.start_time} ~ {ev.end_time}
                      </div>
                    )}

                    {ev.description && (
                      <div className="event-desc">{ev.description}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rp-none">일정 없음</div>
              )}

              <div className="rp-section-title">학사일정</div>
              {academicEvents[contextDate]?.length ? (
                academicEvents[contextDate].map((ev, i) => (
                  <div key={i} className="rp-card academic">
                    <div className="rp-card-title">{ev.title}</div>
                  </div>
                ))
              ) : (
                <div className="rp-none">학사일정 없음</div>
              )}
            </>
          ) : (
            <div className="rp-empty">날짜를 선택하세요</div>
          )}
        </div>
      </div>

      {/* =========================
            일정 추가 모달
         ========================= */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>일정 추가</h3>
            {/* 🔘 오늘 / 기간 선택 */}
            <div className="mode-toggle">
              <button
                className={addMode === 'single' ? 'active' : ''}
                onClick={() => setAddMode('single')}
              >
                오늘
              </button>
              <button
                className={addMode === 'range' ? 'active' : ''}
                onClick={() => setAddMode('range')}
              >
                기간
              </button>
            </div>

            {addMode === 'single' ? (
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            ) : (
              <div className="range-row">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
                <span>~</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </div>
            )}

            <input
              placeholder="일정 제목"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              placeholder="내용"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <div className="time-row">
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
              <span>~</span>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
              />
            </div>
            <div className="color-row">
              <span>색상</span>
              <div className="color-palette">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${
                      newColor === color ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="modal-actions">
              {/* ✅ 추가 모달은 이게 맞음 */}
              <button onClick={() => setShowModal(false)}>취소</button>
              <button onClick={addEvent}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
            일정 수정 모달
         ========================= */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>일정 수정</h3>

            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />

            <div className="time-row">
              <input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
              />
              <span>~</span>
              <input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
              />
            </div>

            <div className="color-row">
              <span>색상</span>
              <div className="color-palette">
                {COLOR_PALETTE.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${
                      newColor === color ? 'selected' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)}>취소</button>
              <button onClick={updateEvent}>저장</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="modal-backdrop">
          <div className="delete-modal">
            <h3 className="delete-title">일정 삭제</h3>

            <p className="delete-message">
              <strong>{deleteTarget.title}</strong> 일정을 삭제할까요?
              <br />
              삭제하면 복구할 수 없습니다.
            </p>

            <div className="delete-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
              >
                취소
              </button>
              <button className="btn-delete" onClick={confirmDelete}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================= */}
      {/*          스타일           */}
      {/* ========================= */}
      <style jsx>{`
        .page-wrapper {
          width: 100%;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          background: #f5f7fb;
        }

        .main-layout {
          width: 1120px;
          display: flex;
          gap: 28px;
          padding: 64px 20px;
        }

        .calendar-area,
        .right-panel {
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.07);
        }

        .calendar-area {
          flex: 1;
        }

        .right-panel {
          width: 260px;
        }

        .month-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          margin-top: 40px;
        }

        .nav-btn {
          border: none;
          background: #f3f4f6;
          border-radius: 999px;
          padding: 6px 12px;
          cursor: pointer;
        }

        .weekday-row,
        .grid-calendar {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .weekday-row {
          font-size: 12px;
          margin-bottom: 6px;
        }

        .weekday-row {
          text-align: center; /* ⭐ 요일 전체 중앙 */
        }

        .weekday-row .w {
          display: flex;
          justify-content: center;
          align-items: center; /* ⭐ 각 요일 셀 중앙 */
        }

        .grid-calendar {
          gap: 2px;
        }

        .cell {
          min-height: 90px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 6px;
          cursor: pointer;
          position: relative;
          overflow: hidden; /* 🔥 넘치는 내용 숨김 */
        }

        .cell.empty {
          border: none;
        }

        .cell.selected {
          border: 2px solid #4f46e5;
        }

        .cell-date {
          font-size: 14px;
          font-weight: 600;
        }

        .cell-academic {
          margin-top: 2px;
          font-size: 10px;
          padding: 2px 4px;
          background: #eff6ff;
          border-radius: 6px;
          color: #1d4ed8;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dot {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0ea5e9;
        }

        .today-badge {
          position: absolute;
          top: 6px;
          right: 6px;
          background: #111827;
          color: #fff;
          font-size: 10px;
          padding: 2px 4px;
          border-radius: 6px;
        }

        .rp-section-title {
          margin-top: 10px;
          font-size: 13px;
          font-weight: 600;
        }

        .rp-card.academic {
          background: #eff6ff;
          border-radius: 10px;
          padding: 8px;
          margin-top: 6px;
        }

        .rp-card-title {
          font-size: 13px;
          font-weight: 600;
        }

        .rp-none,
        .rp-empty {
          margin-top: 8px;
          font-size: 13px;
          color: #9ca3af;
        }

        .rp-date {
          font-size: 15px;
          font-weight: 600;
        }

        .add-btn {
          margin: 10px 0;
          width: 100%;
          border: none;
          background: #4f46e5;
          color: #fff;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          width: 400px;
          height: 450px;
        }

        .modal input {
          width: 100%;
          padding: 8px;
          margin-top: 10px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }

        .modal textarea {
          width: 100%;
          min-height: 44px;
          padding: 8px;
          margin-top: 8px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          font-size: 13px;
          resize: none;
        }

        .time-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
        }

        .color-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }

        .event-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 10px 12px;
          margin-top: 8px;
          border-left: 5px solid #4f46e5;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .event-title {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .event-time {
          font-size: 11px;
          color: #6b7280;
        }

        .event-desc {
          font-size: 12px;
          color: #374151;
          line-height: 1.4;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .edit-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          color: #6b7280;
        }

        .edit-btn:hover {
          color: #111827;
        }

        .color-palette {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          margin-top: 8px;
        }

        .color-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
        }

        .color-btn.selected {
          border-color: #111827;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
        }

        /* 🔥 모달 입력 정렬 고정 (핵심) */
        .modal input,
        .modal textarea {
          box-sizing: border-box;
          text-align: left;
        }

        /* 🔥 date / time 내부 텍스트 왼쪽 정렬 */
        .modal input[type='date']::-webkit-datetime-edit,
        .modal input[type='time']::-webkit-datetime-edit {
          text-align: left;
        }

        /* 🔥 아이콘 때문에 더 밀려 보이는 것 방지 */
        .modal input[type='date'],
        .modal input[type='time'] {
          padding-right: 10px;
        }

        .event-actions {
          display: flex;
          gap: 6px; /* 버튼 간격 */
          align-items: center;
        }

        .edit-btn.delete {
          color: #ef4444;
        }

        .edit-btn.delete:hover {
          color: #b91c1c;
        }
        .mode-toggle {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .mode-toggle button {
          flex: 1;
          padding: 6px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          background: #f9fafb;
          cursor: pointer;
          font-size: 13px;
        }

        .mode-toggle button.active {
          background: #4f46e5;
          color: #fff;
          border-color: #4f46e5;
        }

        .range-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* 🔥 삭제 확인 모달 */
        .delete-modal {
          position: fixed; /* ⭐ 중요 */
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%); /* ⭐ 중앙 정렬 */
          background: #ffffff;
          border-radius: 14px;
          padding: 20px;
          width: 80%;
          max-width: 360px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          animation: pop 0.15s ease-out;
          z-index: 10000;
        }

        .delete-title {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #111827;
        }

        .delete-message {
          font-size: 13px;
          color: #374151;
          line-height: 1.5;
        }

        .delete-message strong {
          color: #111827;
        }

        .delete-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        .btn-cancel {
          border: none;
          background: #f3f4f6;
          color: #374151;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-delete {
          border: none;
          background: #ef4444;
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        }

        .btn-delete:hover {
          background: #dc2626;
        }

        @keyframes pop {
          from {
            transform: scale(0.96);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* ===============================
   📱 Mobile Responsive
================================ */

        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column;
            width: 100%;
            padding: 16px;
            gap: 16px;
          }

          .calendar-area,
          .right-panel {
            width: 100%;
            padding: 12px;
            border-radius: 14px;
          }

          /* ===== 🔥 모달 덮어쓰기 (핵심) ===== */
          .modal {
            width: 80%;
            height: 58dvh; /* 🔥 핵심 */
            max-height: none; /* 🔥 제거 */
            border-radius: 16px 16px 0 0;
            position: fixed;
            bottom: 0;
            top: 20%; /* ← 위로 올리는 핵심 */
            left: 15;
            right: 0;
            overflow-y: auto;
            padding: 16px 14px calc(env(safe-area-inset-bottom) + 20px);
          }

          .modal-backdrop {
            align-items: flex-end;
          }

          /* ===== 기타 모바일 조정 ===== */
          .cell {
            min-height: 55px;
            padding: 0.5px;
          }

          .cell-date {
            font-size: 10px;
          }

          .add-btn {
            padding: 10px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  )
}
