'use client'
import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { apiFetch } from '@/src/lib/apiFetch'

interface ClassItem {
  day: string
  period: number
  subject: string
  teacher: string
  room: string
}

interface OCRCandidate {
  subject: string
  teacher: string
  room: string
  period: number
  day: string | null
}

interface AddSlot {
  day: string
  period: number
}

/* ===== 과목 평가 타입 ===== */
interface SubjectReview {
  id: number
  rating: number
  reason: string
  createdAt: string
  teacher: string
  userId: number
}

// 평가 목록 불러오기
const fetchSubjectReviews = async (
  year: number,
  semester: '1학기' | '2학기',
  school: string,
) => {
  const res = await apiFetch(
    `/api/subject-review?year=${year}&semester=${semester}&school=${encodeURIComponent(
      school,
    )}`,
  )

  if (!res.ok) return {}
  return res.json()
}

// 평가 저장
const postSubjectReview = async (payload: {
  year: number
  semester: '1학기' | '2학기'
  subject: string
  teacher: string
  rating: number
  reason: string
  userId: number
  school: string // 🔥 추가
}) => {
  await apiFetch('/api/subject-review', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// 평가 삭제
const deleteSubjectReviewAPI = async (payload: {
  id: number
  userId: number
}) => {
  await apiFetch('/api/subject-review', {
    method: 'DELETE',
    body: JSON.stringify(payload),
  })
}

const DEFAULT_SUBJECTS = [
  '국어',
  '수학',
  '영어',
  '통합과학',
  '과학탐구실험',
  '통합사회',
  '체육',
  '음악',
  '미술',
  '자율학습',
  '한국사',
]

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

const DAYS = ['월', '화', '수', '목', '금']
const PERIODS = Array.from({ length: 10 }, (_, i) => i + 1)

export default function TimetablePage() {
  const [myUserId, setMyUserId] = useState<number | null>(null)
  const [mySchool, setMySchool] = useState<string | null>(null)

  const [classes, setClasses] = useState<ClassItem[]>([])
  const [edit, setEdit] = useState<ClassItem | null>(null)

  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const CURRENT_YEAR = new Date().getFullYear()

  const YEARS = Array.from(
    { length: 3 + 1 + 1 }, // 과거3 + 현재1 + 미래1
    (_, i) => CURRENT_YEAR - 3 + i,
  )

  const [term, setTerm] = useState<{
    year: number
    semester: '1학기' | '2학기'
  }>({
    year: CURRENT_YEAR,
    semester: '1학기',
  })

  const [addForm, setAddForm] = useState<{
    slots: AddSlot[]
    subject: string
    teacher: string
    room: string
  }>({
    // 기본으로 한 칸 만들어두기 (월 1교시)
    slots: [{ day: '월', period: 1 }],
    subject: '',
    teacher: '',
    room: '',
  })

  const tableRef = useRef<HTMLDivElement>(null)

  const [isMobile, setIsMobile] = useState(false)

  // const fullOCRInputRef = useRef<HTMLInputElement>(null)

  // 🔥 Full OCR 결과 임시 보관
  const [ocrCandidates, setOCRCandidates] = useState<OCRCandidate[]>([])

  const [ocrModalOpen, setOCRModalOpen] = useState(false)

  // const handleFullOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (!file) return

  //   const formData = new FormData()
  //   formData.append('image', file)

  //   try {
  //     const res = await fetch('/api/timetable/parse-full', {
  //       method: 'POST',
  //       body: formData,
  //     })

  //     if (!res.ok) {
  //       alert('시간표 분석 실패')
  //       return
  //     }

  //     const data = await res.json()
  //     console.log('📦 OCR FULL RESULT:', data)

  //     // ✅ parse-full은 classes ❌ / candidates ⭕
  //     if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
  //       alert('수업 정보를 인식하지 못했습니다')
  //       return
  //     }

  //     // ❌ 자동 저장 절대 금지
  //     // await save(...)

  //     // ⭕ 임시 상태로만 보관
  //     const DAYS = ['월', '화', '수', '목', '금']

  //     // 🔥 교시별로 묶기
  //     const grouped: Record<number, OCRCandidate[]> = {}

  //     for (const c of data.candidates) {
  //       if (!grouped[c.period]) grouped[c.period] = []
  //       grouped[c.period].push(c)
  //     }

  //     // 🔥 교시 안에서 요일 순서대로 배정
  //     const withDay: OCRCandidate[] = []

  //     Object.values(grouped).forEach((list) => {
  //       list.forEach((c, idx) => {
  //         withDay.push({
  //           ...c,
  //           day: DAYS[idx] ?? null, // 월~금 자동 배치
  //         })
  //       })
  //     })

  //     setOCRCandidates(withDay)

  //     setOCRModalOpen(true)
  //   } catch (err) {
  //     console.error('FULL OCR ERROR:', err)
  //     alert('시간표 OCR 중 오류가 발생했습니다.')
  //   } finally {
  //     if (fullOCRInputRef.current) {
  //       fullOCRInputRef.current.value = ''
  //     }
  //   }
  // }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ----------------- 초기 로드 ----------------- */
  useEffect(() => {
    if (!myUserId) return

    apiFetch(`/api/timetable?year=${term.year}&semester=${term.semester}`)
      .then((res) => res.json())
      .then((data) => {
        setClasses(Array.isArray(data) ? data : [])
      })
      .catch(() => setClasses([]))
  }, [term, myUserId])

  /* 🔥 선택한 연도/학기 Home에서도 쓰기 위해 저장 */
  useEffect(() => {
    localStorage.setItem('current_timetable_term', JSON.stringify(term))
  }, [term])

  useEffect(() => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    try {
      const user = JSON.parse(stored)
      if (user?.id) {
        setMyUserId(user.id)
        setMySchool(user.school)
      }
    } catch {}
  }, [])

  const save = async (next: ClassItem[]) => {
    setClasses(next)

    await apiFetch('/api/timetable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        year: term.year,
        semester: term.semester,
        classes: next,
      }),
    })
  }

  /* ----------------- URL 생성 함수 ----------------- */
  const getShareURL = () => {
    const json = JSON.stringify(classes)
    const encoded = btoa(encodeURIComponent(json))
    return `${window.location.origin}/timetable?data=${encoded}`
  }

  /* ----------------- 캡처 함수 ----------------- */
  const captureImage = async () => {
    if (!tableRef.current) return null
    const tableEl = tableRef.current

    const prevWidth = tableEl.style.width
    tableEl.style.width = '1000px'
    tableEl.style.maxWidth = '1000px'

    const canvas = await html2canvas(tableEl, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: 1000,
    })

    tableEl.style.width = prevWidth || ''
    tableEl.style.maxWidth = ''

    return canvas
  }

  /* ----------------- 이미지 저장 ----------------- */
  const saveImage = async () => {
    const canvas = await captureImage()
    if (!canvas) return alert('캡처 실패')

    const link = document.createElement('a')
    const yyyy = new Date().getFullYear()
    const mm = String(new Date().getMonth() + 1).padStart(2, '0')
    const dd = String(new Date().getDate()).padStart(2, '0')

    link.download = `${yyyy}-${mm}-${dd}_시간표.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  /* ----------------- URL 공유 ----------------- */
  const shareURL = async () => {
    const url = getShareURL()
    try {
      await navigator.share({
        title: '내 시간표',
        text: '시간표입니다!',
        url,
      })
    } catch {
      navigator.clipboard.writeText(url)
      alert('공유 미지원 환경입니다. URL 복사 완료!')
    }
  }

  /* ----------------- 이미지 + URL 동시에 ----------------- */
  const saveImageAndShare = async () => {
    const canvas = await captureImage()
    if (!canvas) return alert('캡처 실패')

    const link = document.createElement('a')
    link.download = 'timetable.png'
    link.href = canvas.toDataURL()
    link.click()

    const url = getShareURL()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    )
    if (!blob) return alert('이미지 변환 실패')

    const file = new File([blob], 'timetable.png', { type: 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: '내 시간표',
          text: '시간표입니다!',
          url,
          files: [file],
        })
        return
      } catch {}
    }

    navigator.clipboard.writeText(url)
    alert('공유 미지원 환경입니다. URL 복사 완료!')
  }

  /* ----------------- 셀 수정 ----------------- */
  const openEdit = (day: string, period: number) => {
    const existing = classes.find((c) => c.day === day && c.period === period)
    setEdit(existing ?? { day, period, subject: '', teacher: '', room: '' })
  }

  const saveEdit = () => {
    if (!edit) return
    if (!edit.subject.trim()) {
      const filtered = classes.filter(
        (c) => !(c.day === edit.day && c.period === edit.period),
      )
      save(filtered)
      setEdit(null)
      return
    }

    const filtered = classes.filter(
      (c) => !(c.day === edit.day && c.period === edit.period),
    )
    save([...filtered, edit])
    setEdit(null)
  }

  const deleteEdit = () => {
    if (!edit) return
    const filtered = classes.filter(
      (c) => !(c.day === edit.day && c.period === edit.period),
    )
    save(filtered)
    setEdit(null)
  }

  /* ----------------- 수업 추가 ----------------- */

  const saveAdd = () => {
    const { slots, subject, teacher, room } = addForm

    if (slots.length === 0) return alert('요일/교시를 추가해주세요')
    if (!subject.trim()) return alert('과목을 입력해주세요')

    let next = [...classes]

    for (const { day, period } of slots) {
      // 기존 같은 칸 지우고
      next = next.filter((c) => !(c.day === day && c.period === period))
      // 새 수업 넣기
      next.push({
        day,
        period,
        subject,
        teacher,
        room,
      })
    }

    save(next)

    // 초기화
    setAddForm({
      slots: [{ day: '월', period: 1 }],
      subject: '',
      teacher: '',
      room: '',
    })

    setAddOpen(false)
  }

  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewSubject, setReviewSubject] = useState<string | null>(null)
  const [reviewTeacher, setReviewTeacher] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [reason, setReason] = useState('')
  const [reviewListOpen, setReviewListOpen] = useState(false)

  const isMyReview = (r: SubjectReview) => r.userId === myUserId

  const [subjectReviews, setSubjectReviews] = useState<
    Record<string, SubjectReview[]>
  >({})

  useEffect(() => {
    if (!mySchool) return
    fetchSubjectReviews(term.year, term.semester, mySchool).then(
      setSubjectReviews,
    )
  }, [term, mySchool])

  const registeredSubjectTeachers = Array.from(
    new Set(
      (Array.isArray(classes) ? classes : [])
        .filter((c) => c.subject && c.teacher)
        .map((c) => `${c.subject}|${c.teacher}`),
    ),
  )
  const makeReviewKey = (subject: string, teacher: string) =>
    `${subject}|${teacher}`

  const getAverageRating = (subject: string, teacher: string) => {
    const key = makeReviewKey(subject, teacher)
    const reviews = subjectReviews[key]
    if (!reviews || reviews.length === 0) return null

    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

    return avg.toFixed(1)
  }

  /* ==========================================================
        화면 출력
  ========================================================== */
  return (
    <div style={wrap}>
      <h2 style={title}>🕑 시간표 관리</h2>

      <div style={termWrapper}>
        <div style={termCard}>
          <span style={termLabel}>학기 선택</span>

          <select
            style={termSelect}
            value={`${term.year}-${term.semester}`}
            onChange={(e) => {
              const [y, s] = e.target.value.split('-')
              if (s === '1학기' || s === '2학기') {
                setTerm({ year: Number(y), semester: s })
              }
            }}
          >
            {YEARS.map((y) =>
              ['1학기', '2학기'].map((s) => (
                <option key={`${y}-${s}`} value={`${y}-${s}`}>
                  {y}년 · {s}
                </option>
              )),
            )}
          </select>
        </div>
      </div>

      <div style={toolbar}>
        <button style={btn('#4FC3F7')} onClick={() => setAddOpen(true)}>
          ➕ 수업 추가하기
        </button>

        {/* <button
          style={btn('#81C784')}
          onClick={() => fullOCRInputRef.current?.click()}
        >
          📷 시간표 사진으로 한 번에 추가
        </button>

        <input
          type="file"
          accept="image/*"
          ref={fullOCRInputRef}
          style={{ display: 'none' }}
          onChange={handleFullOCR}
        /> */}

        {/* 내보내기 옵션 버튼 */}
        <button style={btn('#FF9800')} onClick={() => setExportOpen(true)}>
          📤 내보내기 옵션
        </button>
      </div>

      <div
        style={{
          width: '100%',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            overflowX: 'hidden', // 🔥 모바일 가로 스크롤 제거
          }}
        >
          {/* 캡처 + 테이블 실제 크기 */}
          <div
            ref={tableRef}
            style={{
              width: isMobile ? '100%' : 1000,
              maxWidth: '100%',
              margin: '0 auto',
              background: '#fff',
            }}
          >
            <table style={tableCss}>
              <thead>
                <tr>
                  <th style={th}>교시</th>
                  {DAYS.map((d) => (
                    <th key={d} style={th}>
                      {d}요일
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <td style={periodTh}>{isMobile ? p : `${p}교시`}</td>

                    {DAYS.map((d) => {
                      const cell = classes.find(
                        (c) => c.day === d && c.period === p,
                      )

                      const bg = cell
                        ? getSubjectColor(cell.subject)
                        : '#f8f8f8'

                      return (
                        <td
                          key={d}
                          onClick={() => openEdit(d, p)}
                          style={{
                            border: '1px solid #000',
                            height: isMobile ? 44 : 'clamp(60px, 6vw, 72px)',
                            background: bg,
                            cursor: 'pointer',
                            verticalAlign: 'middle',
                          }}
                        >
                          {cell ? (
                            <div>
                              <strong
                                style={{ fontSize: 'clamp(10px, 1.4vw, 16px)' }}
                              >
                                {cell.subject}
                              </strong>
                              <div
                                style={{
                                  fontSize: 'clamp(8px, 1.2vw, 14px)',
                                  color: '#444',
                                }}
                              >
                                {cell.teacher}
                              </div>
                              <div
                                style={{
                                  fontSize: 'clamp(8px, 1.2vw, 14px)',
                                  color: '#777',
                                }}
                              >
                                {cell.room}
                              </div>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: '#BBB',
                                fontSize: 'clamp(12px, 2vw, 20px)',
                              }}
                            >
                              +
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ===== 과목 평가 영역 ===== */}
          <div style={{ marginTop: 30 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>⭐ 과목 평가</h3>

            {registeredSubjectTeachers.length === 0 && (
              <div style={{ color: '#999' }}>아직 등록된 과목이 없습니다.</div>
            )}

            {registeredSubjectTeachers.map((key) => {
              const [subject, teacher] = key.split('|')
              const avg = getAverageRating(subject, teacher)

              return (
                <div
                  key={key}
                  style={{
                    padding: 14,
                    border: '1px solid #E0E0E0',
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <strong>
                      {subject} ({teacher})
                    </strong>
                    <span style={{ color: '#666' }}>
                      {avg ? `⭐ ${avg}` : '평가 없음'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      style={btn('#CFD8DC')}
                      onClick={() => {
                        setReviewSubject(subject)
                        setReviewTeacher(teacher)
                        setReviewListOpen(true)
                      }}
                    >
                      👀 평가 보기
                    </button>

                    <button
                      style={btn('#4FC3F7')}
                      onClick={() => {
                        setReviewSubject(subject)
                        setReviewTeacher(teacher)
                        setRating(0)
                        setReason('')
                        setReviewModalOpen(true)
                      }}
                    >
                      ✍️ 평가 하기
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {/* ----------------- 내보내기 옵션 모달 ----------------- */}
        {exportOpen && (
          <Modal title="내보내기 옵션" onClose={() => setExportOpen(false)}>
            <button
              style={btn('#4FC3F7')}
              onClick={() => {
                saveImage()
                setExportOpen(false)
              }}
            >
              📸 이미지 저장
            </button>

            <button
              style={btn('#81C784')}
              onClick={() => {
                shareURL()
                setExportOpen(false)
              }}
            >
              🔗 URL 공유
            </button>

            <button
              style={btn('#FFB74D')}
              onClick={() => {
                saveImageAndShare()
                setExportOpen(false)
              }}
            >
              📸 + 🔗 이미지 저장 & 공유
            </button>
          </Modal>
        )}

        {/* ----------------- 수업 추가 모달 ----------------- */}
        {addOpen && (
          <Modal onClose={() => setAddOpen(false)} title="📘 수업 추가">
            {/* 요일+교시 슬롯들 */}
            <Row label={<span style={{ marginLeft: 6 }}>교시</span>}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: '85%',
                }}
              >
                {addForm.slots.map((slot, idx) => (
                  <div
                    key={idx}
                    style={{ display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    {/* 요일 선택 */}
                    <select
                      value={slot.day}
                      onChange={(e) => {
                        const next = [...addForm.slots]
                        next[idx] = { ...slot, day: e.target.value }
                        setAddForm({ ...addForm, slots: next })
                      }}
                      style={{ ...inputCss, flex: 1 }}
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>
                          {d}요일
                        </option>
                      ))}
                    </select>

                    {/* 교시 선택 */}
                    <select
                      value={slot.period}
                      onChange={(e) => {
                        const next = [...addForm.slots]
                        next[idx] = { ...slot, period: Number(e.target.value) }
                        setAddForm({ ...addForm, slots: next })
                      }}
                      style={{ ...inputCss, flex: 1 }}
                    >
                      {PERIODS.map((p) => (
                        <option key={p} value={p}>
                          {p}교시
                        </option>
                      ))}
                    </select>

                    {/* 슬롯 삭제 버튼 */}
                    <button
                      type="button"
                      style={iconBtn}
                      onClick={() => {
                        const next = addForm.slots.filter((_, i) => i !== idx)
                        setAddForm({ ...addForm, slots: next })
                      }}
                    >
                      ❌
                    </button>
                  </div>
                ))}

                {/* 슬롯 추가 버튼 */}
                <button
                  type="button"
                  style={smallBtn('#CFD8DC')}
                  onClick={() =>
                    setAddForm({
                      ...addForm,
                      slots: [...addForm.slots, { day: '월', period: 1 }],
                    })
                  }
                >
                  ➕ 요일/교시 추가
                </button>
              </div>
            </Row>

            <Row label="과목">
              <div style={{ display: 'flex', gap: 6, width: '82%' }}>
                <select
                  value={
                    DEFAULT_SUBJECTS.includes(addForm.subject)
                      ? addForm.subject
                      : ''
                  }
                  onChange={(e) =>
                    setAddForm({ ...addForm, subject: e.target.value })
                  }
                  style={{ ...inputCss, flex: 1 }}
                >
                  <option value="">과목 선택</option>
                  {DEFAULT_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="직접 입력"
                  value={
                    !DEFAULT_SUBJECTS.includes(addForm.subject)
                      ? addForm.subject
                      : ''
                  }
                  onChange={(e) =>
                    setAddForm({ ...addForm, subject: e.target.value })
                  }
                  style={{ ...inputCss, flex: 1, width: '85%' }}
                />
              </div>
            </Row>

            <Row label="교사명">
              <input
                type="text"
                style={inputCss}
                value={addForm.teacher}
                placeholder="예: 김선생"
                onChange={(e) =>
                  setAddForm({ ...addForm, teacher: e.target.value })
                }
              />
            </Row>

            <Row label="교실">
              <input
                type="text"
                style={inputCss}
                value={addForm.room}
                placeholder="예: 2-3"
                onChange={(e) =>
                  setAddForm({ ...addForm, room: e.target.value })
                }
              />
            </Row>

            <div style={modalButtons}>
              <button style={btn('#4FC3F7')} onClick={saveAdd}>
                저장
              </button>
              <button style={btn('#B0BEC5')} onClick={() => setAddOpen(false)}>
                닫기
              </button>
            </div>
          </Modal>
        )}

        {/* ----------------- 수정 모달 ----------------- */}
        {edit && (
          <Modal
            onClose={() => setEdit(null)}
            title={`✏️ ${edit.day}요일 ${edit.period}교시`}
          >
            <Row label="과목">
              <div style={{ display: 'flex', gap: 6, width: '79%' }}>
                <select
                  value={
                    DEFAULT_SUBJECTS.includes(edit.subject) ? edit.subject : ''
                  }
                  onChange={(e) =>
                    setEdit({ ...edit, subject: e.target.value })
                  }
                  style={{ ...inputCss, flex: 0.9, padding: '6px 8px' }}
                >
                  <option value="">과목 선택</option>
                  {DEFAULT_SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="직접 입력"
                  value={
                    !DEFAULT_SUBJECTS.includes(edit.subject) ? edit.subject : ''
                  }
                  onChange={(e) =>
                    setEdit({ ...edit, subject: e.target.value })
                  }
                  style={{ ...inputCss, flex: 1, width: '75%' }}
                />
              </div>
            </Row>

            <Row label="교사명">
              <input
                type="text"
                style={inputCss}
                value={edit.teacher ?? ''}
                placeholder="예: 김선생"
                onChange={(e) => setEdit({ ...edit, teacher: e.target.value })}
              />
            </Row>

            <Row label="장소">
              <input
                type="text"
                style={inputCss}
                value={edit.room}
                placeholder="예: 2-3"
                onChange={(e) => setEdit({ ...edit, room: e.target.value })}
              />
            </Row>

            <div style={modalButtons}>
              <button style={btn('#4FC3F7')} onClick={saveEdit}>
                저장
              </button>
              <button style={btn('#E57373')} onClick={deleteEdit}>
                삭제
              </button>
              <button style={btn('#B0BEC5')} onClick={() => setEdit(null)}>
                닫기
              </button>
            </div>
          </Modal>
        )}

        {reviewModalOpen && (
          <Modal title="과목 평가" onClose={() => setReviewModalOpen(false)}>
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {reviewSubject} ({reviewTeacher})
            </div>

            {/* 별점 */}
            <div style={{ textAlign: 'center', fontSize: 28 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  style={{
                    cursor: 'pointer',
                    color: n <= rating ? '#FFD54F' : '#CCC',
                  }}
                  onClick={() => setRating(n)}
                >
                  ★
                </span>
              ))}
            </div>

            <textarea
              placeholder="평가 이유를 적어주세요 (익명)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: '100%',
                height: 80,
                borderRadius: 8,
                padding: 10,
                border: '1px solid #CCC',
                fontFamily: "'Roboto', sans-serif",
                boxSizing: 'border-box', // 🔥 중요
                resize: 'none',
              }}
            />

            <button
              style={btn('#4FC3F7')}
              onClick={async () => {
                if (!reviewSubject || rating === 0)
                  return alert('별점을 선택하세요')

                if (!mySchool) {
                  alert('학교 정보가 없습니다.')
                  return
                }

                await postSubjectReview({
                  year: term.year,
                  semester: term.semester,
                  subject: reviewSubject,
                  teacher: reviewTeacher!,
                  rating,
                  reason,
                  userId: myUserId ?? 0,
                  school: mySchool, // ✅ 이제 string
                })

                const updated = await fetchSubjectReviews(
                  term.year,
                  term.semester,
                  mySchool, // ✅ 반드시 전달
                )
                setSubjectReviews(updated)

                setSubjectReviews(updated)

                setReviewModalOpen(false)
              }}
            >
              평가 등록
            </button>
          </Modal>
        )}

        {reviewListOpen && reviewSubject && reviewTeacher && (
          <Modal
            title="과목 평가 목록"
            onClose={() => setReviewListOpen(false)}
          >
            {(() => {
              const key = makeReviewKey(reviewSubject, reviewTeacher)
              const reviews = subjectReviews[key] ?? []

              if (reviews.length === 0) {
                return (
                  <div style={{ textAlign: 'center', color: '#999' }}>
                    아직 등록된 평가가 없습니다.
                  </div>
                )
              }

              return (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  {reviews.map((r) => (
                    <div
                      key={r.createdAt}
                      style={{
                        border: '1px solid #E0E0E0',
                        borderRadius: 8,
                        padding: 10,
                      }}
                    >
                      {/* 별점 */}
                      <div style={{ color: '#FFD54F', fontSize: 18 }}>
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </div>

                      {/* 내용 */}
                      <div style={{ fontSize: 14, marginTop: 4 }}>
                        {r.reason || (
                          <span style={{ color: '#999' }}>내용 없음</span>
                        )}
                      </div>

                      {isMyReview(r) && (
                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            style={btn('#4FC3F7')}
                            onClick={async () => {
                              // 1️⃣ 평가 목록 닫기
                              setReviewListOpen(false)

                              // 2️⃣ 수정할 데이터 세팅
                              setRating(r.rating)
                              setReason(r.reason)
                              setReviewSubject(reviewSubject)
                              setReviewTeacher(reviewTeacher)

                              // 3️⃣ 기존 리뷰 삭제
                              await deleteSubjectReviewAPI({
                                id: r.id, // 🔥 이게 핵심
                                userId: myUserId!, // 🔥 로그인 유저
                              })

                              // 4️⃣ 최신 목록 다시 로드
                              if (!mySchool) return

                              const updated = await fetchSubjectReviews(
                                term.year,
                                term.semester,
                                mySchool,
                              )

                              setSubjectReviews(updated)

                              // 5️⃣ 평가 모달 열기
                              setReviewModalOpen(true)
                            }}
                          >
                            수정
                          </button>

                          <button
                            style={btn('#E57373')}
                            onClick={async () => {
                              await deleteSubjectReviewAPI({
                                id: r.id,
                                userId: myUserId!,
                              })

                              if (!mySchool) return

                              const updated = await fetchSubjectReviews(
                                term.year,
                                term.semester,
                                mySchool,
                              )

                              setSubjectReviews(updated)
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}
          </Modal>
        )}

        {ocrModalOpen && (
          <Modal
            title="📷 인식된 시간표 미리보기"
            onClose={() => setOCRModalOpen(false)}
          >
            {ocrCandidates.map((c, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #E0E0E0',
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 8,
                }}
              >
                <strong>{c.period}교시</strong>
                <div>과목: {c.subject}</div>
                <div>교사: {c.teacher}</div>
                <div>교실: {c.room}</div>

                {/* 🔥 요일 선택 (핵심 수정) */}
                <select
                  value={c.day ?? ''}
                  onChange={(e) => {
                    const next = [...ocrCandidates]
                    next[idx] = { ...c, day: e.target.value }
                    setOCRCandidates(next)
                  }}
                  style={{
                    marginTop: 6,
                    padding: '4px 6px',
                    width: '100%',
                  }}
                >
                  <option value="">요일 선택</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}요일
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              style={btn('#4FC3F7')}
              onClick={() => {
                // 🔥 요일 선택 안 된 항목 방어
                const valid = ocrCandidates.filter(
                  (c) =>
                    c.day &&
                    c.subject.trim() &&
                    Number.isInteger(c.period) &&
                    c.period >= 1 &&
                    c.period <= 10,
                )

                if (valid.length === 0) {
                  alert('저장할 수 있는 수업이 없습니다')
                  return
                }

                const mapped: ClassItem[] = valid.map((c) => ({
                  day: c.day!, // ✅ 각 수업마다 선택한 요일
                  period: c.period,
                  subject: c.subject,
                  teacher: c.teacher,
                  room: c.room,
                }))

                const next = [...classes]

                for (const item of mapped) {
                  const idx = next.findIndex(
                    (c) => c.day === item.day && c.period === item.period,
                  )
                  if (idx >= 0) next[idx] = item
                  else next.push(item)
                }

                save(next) // ✅ 실제 시간표 + DB 저장
                setOCRModalOpen(false)
              }}
            >
              시간표에 저장
            </button>
          </Modal>
        )}
      </div>
    </div>
  )
}

/* ----------------- 공통 컴포넌트 ----------------- */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div style={overlay}>
      <div style={{ ...modalBox, position: 'relative' }}>
        {/* 🔥 X 버튼 추가 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'transparent',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#555',
          }}
        >
          ✖
        </button>

        <h3 style={modalTitle}>{title}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: React.ReactNode // 🔥 string → ReactNode
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={labelCss}>{label}</label>
      {children}
    </div>
  )
}

/* ----------------- 스타일 ----------------- */

const wrap: React.CSSProperties = {
  maxWidth: 1000,
  margin: '20px auto',
  background: 'white',
  borderRadius: 16,
  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
  padding: 'clamp(12px, 4vw, 30px)',
}

const title: React.CSSProperties = {
  fontSize: 'clamp(20px, 3vw, 30px)',
  fontWeight: 700,
  color: '#4FC3F7',
  marginBottom: 20,
}

const toolbar: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 10,
}

const tableCss: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  textAlign: 'center',
}

const th: React.CSSProperties = {
  padding: '6px 4px',
  background: '#E3F2FD',
  border: '1px solid #E0E0E0',
  fontWeight: 600,
  fontSize: 'clamp(10px, 3vw, 16px)',
}

const periodTh: React.CSSProperties = {
  ...th,
  width: 50,
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100,
}

const modalBox: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 20,
  width: '80%', // ✅ 모바일 대응
  maxWidth: 420, // ✅ PC 최대 폭
  maxHeight: '80dvh', // ✅ 모바일 화면 기준 높이
  overflowY: 'auto', // ✅ 내용 많으면 스크롤

  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
}

const modalTitle: React.CSSProperties = {
  fontWeight: 700,
  color: '#0277BD',
  marginBottom: 12,
  textAlign: 'center',
  fontSize: 'clamp(16px, 2vw, 26px)',
}

const modalButtons: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',

  gap: 10,
  marginTop: 8,
}

const labelCss: React.CSSProperties = {
  width: 70,
  textAlign: 'right',
  fontWeight: 600,
  color: '#333',
  fontSize: 'clamp(10px, 1.6vw, 16px)',
}

const inputCss: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  border: '1px solid #bbb',
  borderRadius: 6,
  outline: 'none',
  fontSize: 'clamp(10px, 1.4vw, 16px)',
}

const btn = (color: string): React.CSSProperties => ({
  background: color,
  alignItems: 'center',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  padding: '8px 14px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 'clamp(10px, 1.6vw, 16px)',
})

const termWrapper: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginBottom: 16,
  fontFamily: "'Roboto', sans-serif",
}

const termCard: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  background: '#F5F7FA',
  borderRadius: 999,
  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
}

const termLabel: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: '#555',
}

const termSelect: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  border: 'none',
  outline: 'none',
  background: '#FFFFFF',
  padding: '6px 14px',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'Roboto', sans-serif",
  boxShadow: 'inset 0 0 0 1px #DDD',
}

const iconBtn: React.CSSProperties = {
  width: 25,
  height: 25,
  minWidth: 25,
  minHeight: 25,
  padding: 0,
  borderRadius: 6,
  border: 'none',
  background: '#CFD8DC',
  color: '#fff',
  fontSize: 14,
  lineHeight: '28px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const smallBtn = (color: string): React.CSSProperties => ({
  background: color,
  color: '#333',
  border: 'none',
  borderRadius: 6,
  padding: '4px 6px',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 13,
  lineHeight: 1.2,
  width: 'fit-content', // 🔥 내용만큼만
  marginLeft: 'auto', // ✅ 오른쪽으로
})
