'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

// 🌟 Modal UI Component
function Modal({ show, title, message, onConfirm, onCancel }) {
  if (!show) return null

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>

        <div className="modal-buttons">
          <button className="modal-confirm" onClick={onConfirm}>
            확인
          </button>
          <button className="modal-cancel" onClick={onCancel}>
            취소
          </button>
        </div>
      </div>

      {/* Modal Styles */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-box {
          width: 330px;
          background: white;
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
          animation: pop 0.25s ease;
          text-align: center;
        }
        .modal-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .modal-message {
          font-size: 14px;
          color: #444;
          margin-bottom: 18px;
          white-space: pre-line;
        }
        .modal-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
        }
        .modal-confirm,
        .modal-cancel {
          padding: 8px 16px;
          border-radius: 6px;
          width: 100px;
          font-weight: 600;
        }
        .modal-confirm {
          background: #4d8dff;
          color: white;
        }
        .modal-cancel {
          background: #aaa;
          color: white;
        }
        @keyframes pop {
          from {
            transform: scale(0.85);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default function GradePage() {
  const [subjects, setSubjects] = useState<string[]>([])
  const [newSubject, setNewSubject] = useState('')

  const [editingSubject, setEditingSubject] = useState<string | null>(null)
  const [editedValue, setEditedValue] = useState('')

  const [scores, setScores] = useState<Record<string, number>>({})

  const examOptions = [
    '1학기 중간고사',
    '1학기 기말고사',
    '2학기 중간고사',
    '2학기 기말고사',
  ]
  const [selectedExam, setSelectedExam] = useState(examOptions[0])

  const [history, setHistory] = useState<
    Record<string, { label: string; score: number }[]>
  >({})

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // 🌟 Modal State
  const [modal, setModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  })

  useEffect(() => {
    const savedSubjects = localStorage.getItem('grade_subjects')
    if (savedSubjects) setSubjects(JSON.parse(savedSubjects))

    const savedScores = localStorage.getItem('grade_scores')
    if (savedScores) setScores(JSON.parse(savedScores))
  }, [])

  useEffect(() => {
    localStorage.setItem('grade_subjects', JSON.stringify(subjects))
  }, [subjects])

  useEffect(() => {
    localStorage.setItem('grade_scores', JSON.stringify(scores))
  }, [scores])

  const loadSubjectsFromTimetable = () => {
    const raw = localStorage.getItem('my_timetable_subjects')

    if (!raw)
      return setModal({
        show: true,
        title: '알림',
        message: '시간표에 저장된 과목이 없습니다.',
        onConfirm: () => setModal((p) => ({ ...p, show: false })),
        onCancel: () => {},
      })

    // ✨ 불러오기 전에 사용자에게 확인 모달 띄우기
    setModal({
      show: true,
      title: '과목 불러오기',
      message: '시간표에서 과목을 가져올까요?',
      onConfirm: () => {
        const timetableSubjects = JSON.parse(raw) as string[]
        const merged = [...new Set([...subjects, ...timetableSubjects])]
        setSubjects(merged)

        setModal({
          show: true,
          title: '불러오기 완료',
          message: '시간표 과목이 추가되었습니다!',
          onConfirm: () => setModal((p) => ({ ...p, show: false })),
          onCancel: () => {},
        })
      },
      onCancel: () => setModal((p) => ({ ...p, show: false })),
    })
  }

  const addNewSubject = () => {
    if (!newSubject.trim()) return
    if (!subjects.includes(newSubject.trim())) {
      setSubjects([...subjects, newSubject.trim()])
    }
    setNewSubject('')
  }

  const deleteSubject = (subj: string) => {
    setModal({
      show: true,
      title: '과목 삭제',
      message: `'${subj}' 과목을 삭제할까요?`,
      onConfirm: () => {
        setSubjects(subjects.filter((s) => s !== subj))

        const newScores = { ...scores }
        delete newScores[subj]
        setScores(newScores)

        const newHistory = { ...history }
        delete newHistory[subj]
        setHistory(newHistory)

        if (selectedSubject === subj) setSelectedSubject(null)

        setModal((p) => ({ ...p, show: false }))
      },
      onCancel: () => setModal((p) => ({ ...p, show: false })),
    })
  }

  const saveEdit = () => {
    if (!editingSubject || !editedValue.trim()) return

    if (
      subjects.includes(editedValue.trim()) &&
      editedValue.trim() !== editingSubject
    ) {
      setModal({
        show: true,
        title: '오류',
        message: '이미 존재하는 과목입니다.',
        onConfirm: () => setModal((p) => ({ ...p, show: false })),
        onCancel: () => {},
      })
      return
    }

    const updatedSubjects = subjects.map((s) =>
      s === editingSubject ? editedValue.trim() : s
    )
    setSubjects(updatedSubjects)

    const newScores = { ...scores }
    if (newScores[editingSubject] !== undefined) {
      newScores[editedValue.trim()] = newScores[editingSubject]
      delete newScores[editingSubject]
    }
    setScores(newScores)

    const newHistory = { ...history }
    if (newHistory[editingSubject]) {
      newHistory[editedValue.trim()] = newHistory[editingSubject]
      delete newHistory[editingSubject]
    }
    setHistory(newHistory)

    setEditingSubject(null)
    setEditedValue('')
  }

  // 🔥 저장 함수 (정말 저장만 수행)
  const saveScores = () => {
    const updatedHistory = { ...history }

    Object.keys(scores).forEach((subj) => {
      const prev = updatedHistory[subj] ? [...updatedHistory[subj]] : []
      const existIndex = prev.findIndex((e) => e.label === selectedExam)

      if (existIndex >= 0) {
        prev[existIndex] = {
          ...prev[existIndex],
          score: scores[subj],
        }
        updatedHistory[subj] = [...prev]
      } else {
        updatedHistory[subj] = [
          ...prev,
          {
            label: selectedExam,
            score: scores[subj],
          },
        ]
      }
    })

    setHistory(updatedHistory)
    localStorage.setItem('grade_history', JSON.stringify(updatedHistory))
  }

  useEffect(() => {
    const raw = localStorage.getItem('grade_history')
    if (raw)
      setHistory(
        JSON.parse(raw) as Record<string, { label: string; score: number }[]>
      )
  }, [])

  const getAverage = () => {
    const arr = Object.values(scores).filter((v) => typeof v === 'number')
    if (arr.length === 0) return '-'
    return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
  }

  return (
    <div className="page-wrap">
      <h1 className="title">내신 성적 입력</h1>
      <p className="subtitle">시간표 기반 과목 불러오기 + 수정 + 삭제</p>

      {/* 과목 + 시험 입력 */}
      <div className="card">
        <h2 className="section-title">과목 목록</h2>

        <button
          onClick={loadSubjectsFromTimetable}
          style={{
            marginBottom: 16,
            padding: '10px 16px',
            background: '#81C784',
            color: '#fff',
            borderRadius: 6,
          }}
        >
          시간표에서 과목 불러오기
        </button>

        <div>
          {/* 시험 선택 */}
          <label style={{ marginBottom: 8, display: 'block' }}>시험 선택</label>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ccc',
              marginBottom: 16,
              width: '100%',
            }}
          >
            {examOptions.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          {/* 과목 리스트 */}
          {subjects.map((s) => (
            <div
              key={s}
              className="input-box"
              style={{
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {editingSubject === s ? (
                <>
                  <input
                    type="text"
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    style={{ flex: 1, padding: 10 }}
                  />
                  <button
                    onClick={saveEdit}
                    style={{
                      padding: '8px',
                      background: '#4CAF50',
                      color: 'white',
                      borderRadius: 6,
                    }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingSubject(null)}
                    style={{
                      padding: '8px',
                      background: '#9E9E9E',
                      color: 'white',
                      borderRadius: 6,
                    }}
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <label style={{ flex: 1 }}>{s}</label>
                  <input
                    type="number"
                    placeholder="점수 입력"
                    onChange={(e) =>
                      setScores({ ...scores, [s]: Number(e.target.value) })
                    }
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => {
                      setEditingSubject(s)
                      setEditedValue(s)
                    }}
                    style={{
                      padding: '6px 10px',
                      background: '#FFC107',
                      color: 'white',
                      borderRadius: 6,
                    }}
                  >
                    수정
                  </button>
                  <button
                    onClick={() => deleteSubject(s)}
                    style={{
                      padding: '6px 10px',
                      background: '#E57373',
                      color: 'white',
                      borderRadius: 6,
                    }}
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          ))}

          {/* 과목 추가 */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 6,
                border: '1px solid #ccc',
              }}
              placeholder="새 과목 입력"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
            <button
              onClick={addNewSubject}
              style={{
                padding: '10px 14px',
                borderRadius: 6,
                background: '#4d8dff',
                color: '#fff',
              }}
            >
              추가
            </button>
          </div>

          {/* 🔥 점수 저장 버튼 (저장 전에 확인 모달 띄움) */}
          <button
            onClick={() =>
              setModal({
                show: true,
                title: '점수 저장',
                message: '점수를 저장할까요?',
                onConfirm: () => {
                  saveScores()
                  setModal((p) => ({ ...p, show: false }))
                },
                onCancel: () => setModal((p) => ({ ...p, show: false })),
              })
            }
            style={{
              marginTop: 18,
              padding: '10px 16px',
              background: '#4d8dff',
              color: '#fff',
              borderRadius: 6,
            }}
          >
            점수 저장
          </button>
        </div>
      </div>

      {/* 평균 출력 */}
      <div className="card" style={{ marginTop: 20 }}>
        <h2 className="section-title">과목 평균</h2>
        <p style={{ fontSize: 20, fontWeight: 600 }}>{getAverage()}</p>
      </div>

      {/* 그래프 영역 */}
      <div className="card" style={{ marginTop: 20, position: 'relative' }}>
        <h2 className="section-title">과목별 성적 변화 그래프</h2>

        {/* 그래프 전체 초기화 */}
        <button
          className="reset-btn"
          onClick={() =>
            setModal({
              show: true,
              title: '그래프 초기화',
              message: '전체 과목 그래프 기록을 삭제할까요?',
              onConfirm: () => {
                setHistory({})
                setSelectedSubject(null)
                localStorage.setItem('grade_history', JSON.stringify({}))
                setModal((p) => ({ ...p, show: false }))
              },
              onCancel: () => setModal((p) => ({ ...p, show: false })),
            })
          }
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            padding: '6px 14px',
            background: '#E57373',
            color: '#fff',
            borderRadius: 6,
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          그래프 전체 초기화
        </button>

        {/* 과목 선택 */}
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSubject(s)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border:
                selectedSubject === s ? '2px solid #4d8dff' : '1px solid #ccc',
              background: selectedSubject === s ? '#eef4ff' : '#fff',
              marginRight: 6,
              marginBottom: 6,
            }}
          >
            {s}
          </button>
        ))}

        {/* 그래프 타입 선택 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button
            onClick={() => setChartType('line')}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border:
                chartType === 'line' ? '2px solid #4d8dff' : '1px solid #ccc',
            }}
          >
            꺾은선 그래프
          </button>
          <button
            onClick={() => setChartType('bar')}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border:
                chartType === 'bar' ? '2px solid #4d8dff' : '1px solid #ccc',
            }}
          >
            막대 그래프
          </button>
        </div>

        {/* 선택한 과목 그래프 */}
        {selectedSubject && history[selectedSubject] ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              {chartType === 'line' ? (
                <LineChart data={history[selectedSubject]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line
                    dataKey="score"
                    stroke="#4d8dff"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={history[selectedSubject]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#4d8dff" barSize={30} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: '#888' }}>
            {selectedSubject
              ? '저장된 점수가 없습니다'
              : '먼저 과목을 선택하세요'}
          </p>
        )}
      </div>

      {/* 스타일 */}
      <style jsx>{`
        .page-wrap {
          font-family: 'Noto Sans KR', sans-serif;
          padding: 20px;
          max-width: 900px;
          margin: auto;
        }

        @media (max-width: 600px) {
          .page-wrap {
            padding: 14px;
          }
        }

        .title {
          font-size: 28px;
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .title {
            font-size: 22px;
            text-align: center;
          }
        }

        .subtitle {
          margin-bottom: 16px;
          color: #666;
        }

        @media (max-width: 600px) {
          .subtitle {
            text-align: center;
            font-size: 14px;
          }
        }

        .card {
          background: white;
          padding: 18px;
          border-radius: 12px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 20px;
        }

        @media (max-width: 600px) {
          .card {
            padding: 12px;
            border-radius: 10px;
          }
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 10px;
        }

        @media (max-width: 600px) {
          .section-title {
            font-size: 16px;
            text-align: center;
          }
        }

        .input-box label {
          display: block;
          margin-bottom: 4px;
        }

        .input-box input {
          padding: 10px;
          border-radius: 6px;
          border: 1px solid #ccc;
          width: 100%;
        }

        @media (max-width: 600px) {
          .input-box input {
            font-size: 14px;
            padding: 8px;
          }
        }

        /* 버튼 반응형 스타일 */
        button {
          font-size: 14px;
          cursor: pointer;
        }

        @media (max-width: 600px) {
          button {
            padding: 6px 10px !important;
            font-size: 13px !important;
          }
        }

        /* 그래프 컨테이너, 모바일에서 스크롤 여유 */
        .chart-wrap {
          width: 100%;
          overflow-x: auto;
          padding-bottom: 10px;
        }

        @media (max-width: 600px) {
          .chart-wrap {
            height: 260px;
          }
        }

        /* 📌 모바일에서 그래프 초기화 버튼 위치 조정 */
        @media (max-width: 600px) {
          .reset-btn {
            position: static !important;
            margin-bottom: 10px;
            display: block;
            width: 40%;
            text-align: center;
            background: #e57373 !important;
          }
        }
      `}</style>

      {/* 🌟 Modal Renderer */}
      <Modal
        show={modal.show}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={modal.onCancel}
      />
    </div>
  )
}
