'use client'

import { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from 'recharts'

type ExamType = keyof typeof EXAM_TO_SEMESTER

/* ================= 상수 ================= */
const EXAMS = [
  '1학기 중간고사',
  '1학기 기말고사',
  '2학기 중간고사',
  '2학기 기말고사',
]

const EXAM_TO_SEMESTER = {
  '1학기 중간고사': '1학기',
  '1학기 기말고사': '1학기',
  '2학기 중간고사': '2학기',
  '2학기 기말고사': '2학기',
}

type SubjectsByExam = Record<string, string[]>
type ScoresByExam = Record<string, Record<string, number | undefined>>

export default function GradePage() {
  const CURRENT_YEAR = new Date().getFullYear()
  const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 2 + i)

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [selectedExam, setSelectedExam] = useState(EXAMS[0])
  const [graphType, setGraphType] = useState('line')
  const [maskScore, setMaskScore] = useState(false)

  const [subjectsByExam, setSubjectsByExam] = useState<SubjectsByExam>({})
  const [scoresByExam, setScoresByExam] = useState<ScoresByExam>({})

  const [newSubject, setNewSubject] = useState('')

  const sb: Record<string, string[]> = {}
  const sc: Record<string, Record<string, number>> = {}

  const [editingSubject, setEditingSubject] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  /* ================= 로드 ================= */
  useEffect(() => {
    const loadFromDB = async () => {
      const token = localStorage.getItem('accessToken')
      if (!token) return

      const res = await fetch(`/api/exam-score?year=${selectedYear}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) return

      const rows = await res.json()

      const sb: Record<string, string[]> = {}
      const sc: Record<string, Record<string, number>> = {}

      for (const r of rows) {
        if (!sb[r.exam]) sb[r.exam] = []
        if (!sc[r.exam]) sc[r.exam] = {}

        if (!sb[r.exam].includes(r.subject)) {
          sb[r.exam].push(r.subject)
        }

        sc[r.exam][r.subject] = r.score
      }

      setSubjectsByExam(sb)
      setScoresByExam(sc)
    }

    loadFromDB()
  }, [selectedYear])

  /* ================= 선택된 시험 동기화 ================= */
  useEffect(() => {
    setSubjectsByExam((prev) => {
      if (prev[selectedExam]) return prev
      return {
        ...prev,
        [selectedExam]: [],
      }
    })

    setScoresByExam((prev) => {
      if (prev[selectedExam]) return prev
      return {
        ...prev,
        [selectedExam]: {},
      }
    })
  }, [selectedExam])

  /* ================= 저장 ================= */
  const saveAll = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    const semester = EXAM_TO_SEMESTER[selectedExam as ExamType]

    const scores = scoresByExam[selectedExam]

    if (!scores || Object.keys(scores).length === 0) {
      alert('저장할 점수가 없습니다.')
      return
    }

    const res = await fetch('/api/exam-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        year: selectedYear,
        semester,
        exam: selectedExam,
        scores,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.message || '점수 저장 실패')
      return
    }

    // ✅ 핵심: 저장 후 다시 로드
    await reloadScores()

    alert('점수가 저장되었습니다.')
  }

  const reloadScores = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await fetch(`/api/exam-score?year=${selectedYear}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) return

    const rows = await res.json()

    const sb: SubjectsByExam = {}
    const sc: ScoresByExam = {}

    for (const r of rows) {
      if (!sb[r.exam]) sb[r.exam] = []
      if (!sc[r.exam]) sc[r.exam] = {}

      sb[r.exam].push(r.subject)
      sc[r.exam][r.subject] = r.score
    }

    setSubjectsByExam(sb)
    setScoresByExam(sc)
  }

  const addSubject = async () => {
    const subject = newSubject.trim()
    if (!subject) return alert('과목명을 입력하세요')

    const token = localStorage.getItem('accessToken')
    if (!token) return alert('로그인이 필요합니다.')

    const semester = EXAM_TO_SEMESTER[selectedExam as ExamType]

    const res = await fetch('/api/exam-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        year: selectedYear,
        semester,
        exam: selectedExam,
        scores: {
          [subject]: null, // ⭐ 점수 없는 과목
        },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return alert(err.message || '과목 추가 실패')
    }

    // 프론트 상태에도 반영
    setSubjectsByExam((prev) => ({
      ...prev,
      [selectedExam]: [...(prev[selectedExam] || []), subject],
    }))

    setScoresByExam((prev) => ({
      ...prev,
      [selectedExam]: {
        ...(prev[selectedExam] || {}),
        [subject]: undefined,
      },
    }))

    setNewSubject('')
  }

  const updateSubject = async (oldSubject: string) => {
    const newName = editValue.trim()
    if (!newName) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await fetch('/api/exam-score', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        year: selectedYear,
        exam: selectedExam,
        oldSubject,
        newSubject: newName,
      }),
    })

    if (!res.ok) return alert('과목 수정 실패')

    // 상태 업데이트
    setSubjectsByExam((prev) => ({
      ...prev,
      [selectedExam]: prev[selectedExam].map((s) =>
        s === oldSubject ? newName : s,
      ),
    }))

    setScoresByExam((prev) => {
      const next = { ...(prev[selectedExam] || {}) }
      next[newName] = next[oldSubject]
      delete next[oldSubject]
      return { ...prev, [selectedExam]: next }
    })

    setEditingSubject(null)
    setEditValue('')
  }

  const deleteSubject = async (subject: string) => {
    if (!confirm(`"${subject}" 과목을 삭제할까요?`)) return

    const token = localStorage.getItem('accessToken')
    if (!token) return

    const res = await fetch(
      `/api/exam-score?year=${selectedYear}&exam=${encodeURIComponent(
        selectedExam,
      )}&subject=${encodeURIComponent(subject)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!res.ok) return alert('과목 삭제 실패')

    setSubjectsByExam((prev) => ({
      ...prev,
      [selectedExam]: prev[selectedExam].filter((s) => s !== subject),
    }))

    setScoresByExam((prev) => {
      const next = { ...(prev[selectedExam] || {}) }
      delete next[subject]
      return { ...prev, [selectedExam]: next }
    })
  }

  /* ================= 시간표 과목 불러오기 ================= */
  const loadFromTimetable = async () => {
    const semester = EXAM_TO_SEMESTER[selectedExam as ExamType]

    const token = localStorage.getItem('accessToken')

    if (!token) {
      alert('로그인이 필요합니다.')
      return
    }

    const res = await fetch(
      `/api/timetable?year=${selectedYear}&semester=${semester}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.message || '시간표를 불러오지 못했습니다.')
      return
    }

    const data = await res.json()

    // ✅ 과목명만 추출 + 중복 제거
    const subjects = Array.from(
      new Set(
        data
          .map((row: any) => String(row.subject ?? '').trim())
          .filter(Boolean),
      ),
    )

    setSubjectsByExam((prev: any) => ({
      ...prev,
      [selectedExam]: subjects,
    }))
  }

  const subjects = subjectsByExam[selectedExam] || []
  const scores = scoresByExam[selectedExam] || {}

  /* ================= 평균 ================= */
  const scoreValues = Object.values(scores).filter(
    (v): v is number => typeof v === 'number',
  )

  const avg =
    scoreValues.length === 0
      ? '-'
      : (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(1)

  /* ================= 그래프 데이터 ================= */
  const chartData = EXAMS.map((exam) => {
    const s = scoresByExam[exam]

    const values = s
      ? Object.values(s).filter((v): v is number => typeof v === 'number')
      : []

    return {
      label: exam.replace('학기 ', '').replace('고사', ''),
      avg: values.length
        ? values.reduce((a, b) => a + b, 0) / values.length
        : 0,
    }
  })

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap"
        rel="stylesheet"
      />
      {/* Google Icons */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded"
        rel="stylesheet"
      />

      <div style={styles.wrapper}>
        <div style={styles.page}>
          <h1 style={styles.title}>
            <span className="material-symbols-rounded">school</span>
            내신 성적 관리
          </h1>

          {/* 상단 컨트롤 */}
          <div style={styles.topRow}>
            {/* 왼쪽: 년도 + 시간표 */}
            <div style={styles.yearGroup}>
              <select
                style={styles.select}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>

              <button style={styles.greenBtn} onClick={loadFromTimetable}>
                <span className="material-symbols-rounded">schedule</span>
                시간표 불러오기
              </button>
            </div>

            {/* 오른쪽: 점수 마스킹 */}
            <button
              onClick={() => setMaskScore((v) => !v)}
              style={styles.maskBtn}
            >
              {maskScore ? '점수 보기 👁️' : '점수 가리기 🙈'}
            </button>
          </div>

          {/* 시험 선택 */}
          <div style={styles.examRow}>
            {EXAMS.map((exam) => (
              <button
                key={exam}
                onClick={() => setSelectedExam(exam)}
                style={{
                  ...styles.examBtn,
                  background: selectedExam === exam ? '#2563eb' : '#f1f5f9',
                  color: selectedExam === exam ? '#fff' : '#111',
                }}
              >
                {exam}
              </button>
            ))}
          </div>

          {/* 과목 입력 카드 */}

          <div style={styles.card}>
            {subjects.map((subj) => (
              <div key={subj} style={styles.subjectRow}>
                <div style={styles.left}>
                  {editingSubject === subj ? (
                    <input
                      style={styles.editInput}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateSubject(subj)
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{subj}</span>
                  )}
                </div>

                <div style={styles.right}>
                  <input
                    type={maskScore ? 'password' : 'text'}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    style={styles.scoreInput}
                    placeholder="점수 입력"
                    value={scores[subj] ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d]/g, '')
                      const num = raw === '' ? undefined : Number(raw)

                      setScoresByExam((prev) => {
                        const nextExam = { ...(prev[selectedExam] || {}) }

                        if (num === undefined) {
                          delete nextExam[subj]
                        } else {
                          nextExam[subj] = num
                        }

                        return { ...prev, [selectedExam]: nextExam }
                      })
                    }}
                  />

                  {editingSubject === subj ? (
                    <>
                      <button onClick={() => updateSubject(subj)}>저장</button>
                      <button onClick={() => setEditingSubject(null)}>
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => deleteSubject(subj)}>🗑</button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* 과목 추가 */}
            <div style={styles.addRow}>
              <input
                style={styles.input}
                placeholder="새 과목 추가"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
              <button style={styles.blueBtn} onClick={addSubject}>
                추가
              </button>
            </div>
          </div>

          <div style={styles.saveRow}>
            <button style={styles.saveBtn} onClick={saveAll}>
              <span className="material-symbols-rounded">save</span>
              점수 저장
            </button>
          </div>

          <div style={styles.avgBox}>
            평균 점수 <b>{avg}</b>
          </div>

          {/* 그래프 카드 */}
          <div style={styles.graphCard}>
            <ResponsiveContainer width="100%" height={280}>
              {graphType === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number' ? value.toFixed(1) : value
                    }
                  />
                  <Line dataKey="avg" stroke="#2563eb" strokeWidth={3} />
                </LineChart>
              ) : (
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis
                    domain={[0, 105]}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip
                    formatter={(value) =>
                      typeof value === 'number' ? value.toFixed(1) : value
                    }
                  />
                  <Bar
                    dataKey="avg"
                    fill="#2563eb"
                    maxBarSize={32}
                    label={{
                      formatter: (v: number) => v.toFixed(1),
                      position: 'top',
                    }}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>

            <div style={styles.graphBtnRow}>
              <button
                style={{
                  ...styles.graphBtn,
                  ...(graphType === 'line' ? styles.graphBtnActive : {}),
                }}
                onClick={() => setGraphType('line')}
              >
                📈 꺾은선
              </button>

              <button
                style={{
                  ...styles.graphBtn,
                  ...(graphType === 'bar' ? styles.graphBtnActive : {}),
                }}
                onClick={() => setGraphType('bar')}
              >
                📊 막대
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ================= 스타일 ================= */
const styles = {
  wrapper: {
    background: '#f1f5f9',
    minHeight: '100vh',
    padding: '40px 0',
  },

  page: {
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
    padding: 'clamp(16px, 5vw, 50px)',
    background: '#fff',
    borderRadius: 16,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    fontFamily: 'Noto Sans KR, sans-serif',
  },

  title: {
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },

  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },

  select: {
    padding: 10,
    borderRadius: 8,
    border: '1px solid #ccc',
  },

  examRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },

  examBtn: {
    padding: '8px 14px',
    borderRadius: 20,
    border: 'none',
    cursor: 'pointer',
  },

  card: {
    background: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  subjectRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  scoreInput: {
    width: 80,
    padding: 7,
    borderRadius: 6,
    border: '1px solid #ccc',
    textAlign: 'center',
    fontSize: 14,
    color: '#111', // 기본 값 색
  },

  addRow: {
    display: 'flex',
    gap: 6,
    marginTop: 10,
  },

  input: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
  },

  blueBtn: {
    background: '#2563eb',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: 6,
    border: 'none',
  },

  greenBtn: {
    background: '#22c55e',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 8,
    border: 'none',
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },

  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,

    width: '140px',
    padding: '10px 14px',
    background: '#2563eb',
    color: '#fff',
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 16,
    border: 'none',
    cursor: 'pointer',
  },

  saveRow: {
    display: 'flex',
    justifyContent: 'left',
  },

  avgBox: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 20,
  },

  graphCard: {
    background: '#f8fafc',
    padding: 16,
    borderRadius: 12,
  },

  left: {
    flex: 1,
  },

  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  editInput: {
    padding: 6,
    borderRadius: 6,
    border: '1px solid #ccc',
  },

  yearGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },

  maskBtn: {
    marginBottom: 10,
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
  },

  graphBtnRow: {
    display: 'inline-flex',
    borderRadius: 10,
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
    marginTop: 12,
  },

  graphBtn: {
    padding: '8px 16px',
    fontSize: 14,
    border: 'none',
    background: '#f8fafc',
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  graphBtnActive: {
    background: '#2563eb',
    color: '#fff',
  },
}
