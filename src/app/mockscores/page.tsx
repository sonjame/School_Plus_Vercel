'use client'

import { BarChart, Bar } from 'recharts'
import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const getScoreStorageKey = (grade: number, year: number) => {
  const userId = localStorage.getItem('userId')
  if (!userId) return null
  return `mock_scores_user_${userId}_year_${year}_grade_${grade}`
}

type SubjectKey =
  | 'korean_hw'
  | 'korean_em'
  | 'math_stat'
  | 'math_calc'
  | 'math_geo'
  | 'english'
  | 'history'
  | 'explore1'
  | 'explore2'
  | 'secondLang'

interface SavedEntry {
  korean?: number | null
  koreanType?: string | null

  math?: number | null
  mathType?: string | null

  english?: number | null
  history?: number | null

  explore1?: number | null
  explore1Name?: string | null
  explore2?: number | null
  explore2Name?: string | null

  secondLang?: number | null
  secondLangName?: string | null
}

export default function ScoresPage() {
  // ---------------------------------------------
  // ⭐ 학년별 모의고사 달
  // ---------------------------------------------
  const gradeMonths: Record<number, string[]> = {
    1: ['3월', '6월', '9월', '10월'],
    2: ['3월', '6월', '9월', '10월'],
    3: ['3월', '5월', '6월', '7월', '9월', '10월', '11월'],
  }

  const [grade, setGrade] = useState<number | null>(null)
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [showModal, setShowModal] = useState(false)

  // 🌙 다크모드
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedUser = localStorage.getItem('loggedInUser')
      if (!storedUser) return

      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) return

      const raw = localStorage.getItem(`theme_settings_${userId}`)
      if (!raw) return

      const settings = JSON.parse(raw)
      setDarkMode(Boolean(settings.darkMode))
    } catch {
      setDarkMode(false)
    }
  }, [])

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  // ---------------------------------------------
  // ⭐ 점수 초기 상태
  // ---------------------------------------------
  const emptyScores = { korean: '', math: '', english: '', history: '' }
  const [scores, setScores] = useState(emptyScores)

  // 탐구 관련
  const [explorationArea, setExplorationArea] = useState('')
  const [explorationSubjects, setExplorationSubjects] = useState<string[]>([])
  const [exploreScores, setExploreScores] = useState({ sub1: '', sub2: '' })

  // 제2외국어
  const [secondLang, setSecondLang] = useState('')
  const [secondLangScore, setSecondLangScore] = useState('')

  // 고3 선택과목
  const [koreanType, setKoreanType] = useState('')
  const [mathType, setMathType] = useState('')

  // 저장된 점수 (현재 학년 기준, 월 → SavedEntry)
  const [savedData, setSavedData] = useState<Record<string, SavedEntry>>({})

  // 그래프: 선택된 과목
  const [selectedSubject, setSelectedSubject] = useState<{
    key: SubjectKey
    label: string
  } | null>(null)

  // 🎓 대학 검색
  const [univKeyword, setUnivKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])

  // 🔥 검색 기록 & 연관 검색
  const [recentSearches, setRecentSearches] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])

  const [regionFilter, setRegionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // 그래프 보기: 꺽은선 형식, 막대 형식 버튼 선택
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  // ---------------------------------------------
  // ⭐ 년도 선택 (2026 ~ 2032)
  // ---------------------------------------------
  const yearRange = Array.from({ length: 7 }, (_, i) => 2026 + i)

  // 현재 연도 기본값 (자동 증가 대응)
  const currentYear = new Date().getFullYear()
  const defaultYear =
    currentYear >= 2026 && currentYear <= 2032 ? currentYear : 2026

  const [year, setYear] = useState<number>(defaultYear)

  // ---------------------------------------------
  // ⭐ 탐구 과목 리스트 (학년별)
  // ---------------------------------------------

  // 1학년
  const firstGradeSubjects = ['통합사회', '통합과학']

  // 2학년
  const secondGradeSocial = [
    '생활과 윤리',
    '윤리와 사상',
    '한국지리',
    '세계지리',
    '동아시아사',
    '세계사',
    '경제',
    '정치와 법',
    '사회·문화',
  ]

  const secondGradeScience = ['물리학I', '화학I', '생명과학I', '지구과학I']

  // 3학년
  const social = [
    '생활과 윤리',
    '윤리와 사상',
    '한국지리',
    '세계지리',
    '동아시아사',
    '세계사',
    '정치와 법',
    '경제',
    '사회·문화',
  ]

  const science = [
    '물리학I',
    '화학I',
    '생명과학I',
    '지구과학I',
    '물리학II',
    '화학II',
    '생명과학II',
    '지구과학II',
  ]

  const vocational = ['농업기초기술', '공업일반', '상업경제', '수산해운']

  const secondLanguages = [
    '독일어',
    '프랑스어',
    '스페인어',
    '중국어',
    '일본어',
    '러시아어',
    '베트남어',
    '아랍어',
  ]

  // ---------------------------------------------
  // ⭐ 탐구 선택 로직
  // ---------------------------------------------
  let subjects: string[] = []

  if (grade === 1) {
    subjects = firstGradeSubjects // 고1
  } else if (grade === 2) {
    subjects =
      explorationArea === '사회탐구' ? secondGradeSocial : secondGradeScience // 고2
  } else if (grade === 3) {
    subjects =
      explorationArea === '사회탐구'
        ? social
        : explorationArea === '과학탐구'
          ? science
          : vocational // 고3
  }

  // 탐구 과목 선택
  const toggleSubject = (s: string) => {
    if (explorationSubjects.includes(s)) {
      setExplorationSubjects(explorationSubjects.filter((v) => v !== s))
      return
    }
    if (explorationSubjects.length >= 2) return
    setExplorationSubjects([...explorationSubjects, s])
  }

  // ---------------------------------------------
  // ⭐ 등급 계산 함수들
  // ---------------------------------------------
  const getRawGrade = (score: string) => {
    if (!score || isNaN(Number(score))) return '-'
    const s = Number(score)
    if (s >= 90) return '1등급'
    if (s >= 80) return '2등급'
    if (s >= 70) return '3등급'
    if (s >= 60) return '4등급'
    if (s >= 50) return '5등급'
    if (s >= 40) return '6등급'
    if (s >= 30) return '7등급'
    if (s >= 20) return '8등급'
    return '9등급'
  }

  const getExploreGrade = (score: string) => {
    if (!score || isNaN(Number(score))) return '-'
    const s = Number(score)
    if (s >= 45) return '1등급'
    if (s >= 40) return '2등급'
    if (s >= 35) return '3등급'
    if (s >= 30) return '4등급'
    if (s >= 25) return '5등급'
    if (s >= 20) return '6등급'
    if (s >= 15) return '7등급'
    if (s >= 10) return '8등급'
    return '9등급'
  }

  const getEnglishGrade = (score?: string) => {
    if (!score || isNaN(Number(score))) return '-'
    const s = Number(score)
    if (s >= 90) return '1등급'
    if (s >= 80) return '2등급'
    if (s >= 70) return '3등급'
    if (s >= 60) return '4등급'
    if (s >= 50) return '5등급'
    if (s >= 40) return '6등급'
    if (s >= 30) return '7등급'
    if (s >= 20) return '8등급'
    if (s >= 10) return '9등급'
    return '-'
  }

  const getHistoryGrade = (score?: string) => {
    if (!score || isNaN(Number(score))) return '-'
    const s = Number(score)
    if (s >= 40) return '1등급'
    if (s >= 35) return '2등급'
    if (s >= 30) return '3등급'
    if (s >= 25) return '4등급'
    if (s >= 20) return '5등급'
    if (s >= 10) return '6등급'
    return '-' // ⭐ 추가
  }

  const getSecondLangGrade = (score: string) => {
    if (!score || isNaN(Number(score))) return '-'
    const s = Number(score)
    if (s >= 45) return '1등급'
    if (s >= 40) return '2등급'
    if (s >= 35) return '3등급'
    if (s >= 30) return '4등급'
    if (s >= 25) return '5등급'
    return '6등급 이하'
  }

  function gradeToNumber(grade: string) {
    if (!grade || grade === '-') return null
    const num = parseInt(grade.replace('등급', ''))
    return isNaN(num) ? null : num
  }

  function calculateAverageGrade() {
    const grades: number[] = []

    // 필수 과목
    const korean = gradeToNumber(getRawGrade(scores.korean))
    const math = gradeToNumber(getRawGrade(scores.math))
    const english = gradeToNumber(getEnglishGrade(scores.english))
    const history = gradeToNumber(getHistoryGrade(scores.history))

    if (korean) grades.push(korean)
    if (math) grades.push(math)
    if (english) grades.push(english)
    if (history) grades.push(history)

    // 탐구
    if (grade === 1) {
      const e1 = gradeToNumber(getExploreGrade(exploreScores.sub1))
      const e2 = gradeToNumber(getExploreGrade(exploreScores.sub2))
      if (e1) grades.push(e1)
      if (e2) grades.push(e2)
    } else {
      if (explorationSubjects[0]) {
        const e1 = gradeToNumber(getExploreGrade(exploreScores.sub1))
        if (e1) grades.push(e1)
      }
      if (explorationSubjects[1]) {
        const e2 = gradeToNumber(getExploreGrade(exploreScores.sub2))
        if (e2) grades.push(e2)
      }
    }

    // 제2외국어
    if (grade === 3 && secondLang) {
      const lang = gradeToNumber(getSecondLangGrade(secondLangScore))
      if (lang) grades.push(lang)
    }

    if (grades.length === 0) return '-'

    const avg = grades.reduce((sum, g) => sum + g, 0) / grades.length

    return avg.toFixed(2) + '등급'
  }

  // ---------------------------------------------
  // ⭐ 저장된 점수 로드 (학년 변경/초기)
  // ---------------------------------------------
  const loadSavedScores = (g: number, y: number) => {
    const key = getScoreStorageKey(g, y)
    if (!key) return

    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}
    setSavedData(parsed)
  }

  // ---------------------------------------------
  // ⭐ 학년 선택 시 전체 초기화 + 저장 데이터 로드
  // ---------------------------------------------
  const handleGradeSelect = (g: number) => {
    setGrade(g)
    setMonths(gradeMonths[g])
    setSelectedMonth('')
    setScores(emptyScores)
    setExplorationArea('')
    setExplorationSubjects([])
    setExploreScores({ sub1: '', sub2: '' })
    setSecondLang('')
    setSecondLangScore('')
    setSelectedSubject(null)
    loadSavedScores(g, year)
  }

  // ⭐ 월 변경 시 전체 초기화
  const handleMonthSelect = (m: string) => {
    setSelectedMonth(m)

    if (!grade) return

    const key = getScoreStorageKey(grade, year)
    if (!key) return
    const raw = localStorage.getItem(key)
    const parsed: Record<string, SavedEntry> = raw ? JSON.parse(raw) : {}
    const saved = parsed[m]

    if (!saved) {
      // 저장된 데이터 없으면 초기화
      setScores(emptyScores)
      setExploreScores({ sub1: '', sub2: '' })
      setExplorationSubjects([])
      setSecondLang('')
      setSecondLangScore('')
      return
    }

    // ✅ 필수 과목 복원
    setScores({
      korean: saved.korean?.toString() ?? '',
      math: saved.math?.toString() ?? '',
      english: saved.english?.toString() ?? '',
      history: saved.history?.toString() ?? '',
    })

    // ✅ 탐구 과목 복원
    const subjects: string[] = []
    if (saved.explore1Name) subjects.push(saved.explore1Name)
    if (saved.explore2Name) subjects.push(saved.explore2Name)

    setExplorationSubjects(subjects)
    setExploreScores({
      sub1: saved.explore1?.toString() ?? '',
      sub2: saved.explore2?.toString() ?? '',
    })

    // ✅ 제2외국어 복원
    if (saved.secondLangName) {
      setSecondLang(saved.secondLangName)
      setSecondLangScore(saved.secondLang?.toString() ?? '')
    }
  }

  // ---------------------------------------------
  // ⭐ 점수 저장 (localStorage: 학년별 / 월별)
  // ---------------------------------------------
  const handleSaveScores = async () => {
    if (!grade || !selectedMonth) return

    // 1️⃣ 프론트 localStorage 저장 (기존 유지)
    // -----------------------------
    const key = getScoreStorageKey(grade, year)
    if (!key) return
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : {}

    const getToken = () => {
      const stored = localStorage.getItem('loggedInUser')
      if (!stored) return null
      try {
        return JSON.parse(stored).token
      } catch {
        return null
      }
    }

    parsed[selectedMonth] = {
      // 필수
      korean: scores.korean ? Number(scores.korean) : null,
      koreanType: grade === 3 ? koreanType : null,

      math: scores.math ? Number(scores.math) : null,
      mathType: grade === 3 ? mathType : null,
      english: scores.english ? Number(scores.english) : null,
      history: scores.history ? Number(scores.history) : null,

      // 탐구 1
      explore1: exploreScores.sub1 ? Number(exploreScores.sub1) : null,
      explore1Name: grade === 1 ? '통합사회' : (explorationSubjects[0] ?? null),

      // 탐구 2
      explore2: exploreScores.sub2 ? Number(exploreScores.sub2) : null,
      explore2Name: grade === 1 ? '통합과학' : (explorationSubjects[1] ?? null),

      // 제2외국어
      secondLang:
        grade === 3 && secondLangScore ? Number(secondLangScore) : null,
      secondLangName: grade === 3 ? (secondLang ?? null) : null,
    }

    localStorage.setItem(key, JSON.stringify(parsed))
    setSavedData(parsed)

    // 2️⃣ MySQL 저장 (🔥 추가)
    // -----------------------------
    const payload: Record<string, number> = {}

    if (scores.korean) {
      if (grade === 3 && koreanType) {
        payload[`국어_${koreanType}`] = Number(scores.korean)
      } else {
        payload['국어'] = Number(scores.korean)
      }
    }

    if (scores.math) {
      if (grade === 3 && mathType) {
        payload[`수학_${mathType}`] = Number(scores.math)
      } else {
        payload['수학'] = Number(scores.math)
      }
    }
    if (scores.english) payload['영어'] = Number(scores.english)
    if (scores.history) payload['한국사'] = Number(scores.history)

    if (grade === 1) {
      if (exploreScores.sub1) payload['통합사회'] = Number(exploreScores.sub1)
      if (exploreScores.sub2) payload['통합과학'] = Number(exploreScores.sub2)
    }

    if (grade !== 1) {
      if (explorationSubjects[0] && exploreScores.sub1) {
        payload[explorationSubjects[0]] = Number(exploreScores.sub1)
      }
      if (explorationSubjects[1] && exploreScores.sub2) {
        payload[explorationSubjects[1]] = Number(exploreScores.sub2)
      }
    }

    if (grade === 3 && secondLang && secondLangScore) {
      payload[secondLang] = Number(secondLangScore)
    }

    const token = getToken()
    if (!token) {
      alert('로그인이 필요합니다')
      return
    }

    await fetch('/api/mock-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // ✅ 수정 완료
      },
      body: JSON.stringify({
        year,
        grade,
        month: selectedMonth,
        scores: payload,
      }),
    })

    setShowModal(true)
    setTimeout(() => setShowModal(false), 1500)
  }

  const handleSearchUniv = async () => {
    if (!univKeyword) return

    const res = await fetch(
      `/api/univ-search?q=${encodeURIComponent(univKeyword)}`,
    )
    const text = await res.text()

    const parser = new DOMParser()
    const xml = parser.parseFromString(text, 'text/xml')

    // 🔥 career.go 구조
    const items = Array.from(xml.getElementsByTagName('content'))

    let parsed = items.map((item) => ({
      school: item.getElementsByTagName('schoolName')[0]?.textContent,
      region: item.getElementsByTagName('region')[0]?.textContent,
      address: item.getElementsByTagName('adres')[0]?.textContent,
      type: item.getElementsByTagName('schoolGubun')[0]?.textContent,
      link: item.getElementsByTagName('link')[0]?.textContent,
      estType: item.getElementsByTagName('estType')[0]?.textContent,
    }))

    // 🔥 지역 필터
    if (regionFilter) {
      parsed = parsed.filter((v) => v.region?.includes(regionFilter))
    }

    // 🔥 4년제 필터
    if (typeFilter) {
      parsed = parsed.filter((v) => v.type?.includes(typeFilter))
    }

    // 🔥 중복 제거 (캠퍼스 여러개 문제 해결)
    const unique = new Map()
    parsed.forEach((item) => {
      const key = item.school + item.address // ⭐ 핵심 수정
      if (!unique.has(key)) {
        unique.set(key, item)
      }
    })

    setResults(Array.from(unique.values()))

    console.log(parsed)

    // ⭐ 먼저 UI에 바로 추가
    setRecentSearches((prev) => {
      const exists = prev.find((v) => v.keyword === univKeyword)
      if (exists) return prev

      return [
        { id: Date.now(), keyword: univKeyword }, // 임시 id
        ...prev,
      ].slice(0, 10)
    })

    // ⭐ 서버 저장
    await saveSearchHistory(univKeyword)

    // ⭐ 서버 데이터 동기화
    fetchRecentSearches()
  }

  // 🔥 검색 기록 저장
  const saveSearchHistory = async (keyword: string) => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    const token = JSON.parse(stored).token

    await fetch('/api/univ-search-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ keyword }),
    })
  }

  // 🔥 최근 검색 가져오기
  const fetchRecentSearches = async () => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    let token = null
    try {
      token = JSON.parse(stored).token
    } catch {}

    if (!token) return // 🔥 이거 중요

    const res = await fetch('/api/univ-search-history', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      console.log('검색 기록 불러오기 실패', res.status)
      return
    }

    const data = await res.json()
    setRecentSearches(data)
  }

  // 🔥 자동완성
  const fetchSuggestions = async (q: string) => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    const token = JSON.parse(stored).token

    const res = await fetch(
      `/api/univ-search-history?q=${encodeURIComponent(q)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    const data = await res.json()
    setSuggestions(data)
  }

  // 🔥 단일 삭제
  const deleteSearch = async (id: number) => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    const token = JSON.parse(stored).token

    await fetch('/api/univ-search-history', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    })

    fetchRecentSearches()
  }

  // 🔥 전체 삭제
  const deleteAllSearch = async () => {
    const stored = localStorage.getItem('loggedInUser')
    if (!stored) return

    const token = JSON.parse(stored).token

    await fetch('/api/univ-search-history', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    setRecentSearches([])
  }

  useEffect(() => {
    fetchRecentSearches()
  }, [])

  // ---------------------------------------------
  // ⭐ 과목별 색상
  // ---------------------------------------------
  const subjectColors: Record<SubjectKey, string> = {
    korean_hw: '#e74c3c',
    korean_em: '#c0392b',

    math_stat: '#3498db',
    math_calc: '#2980b9',
    math_geo: '#1f5f8b',

    english: '#2ecc71',
    history: '#9b59b6',
    explore1: '#e67e22',
    explore2: '#f1c40f',
    secondLang: '#1abc9c',
  }

  // ---------------------------------------------
  // ⭐ 그래프용 과목 버튼 목록
  // ---------------------------------------------
  const subjectButtons: { key: SubjectKey; label: string }[] = []
  if (grade === 3) {
    subjectButtons.push(
      { key: 'korean_hw', label: '국어-화법과작문' },
      { key: 'korean_em', label: '국어-언어와매체' },
      { key: 'math_stat', label: '수학-확률과통계' },
      { key: 'math_calc', label: '수학-미적분' },
      { key: 'math_geo', label: '수학-기하' },
    )
  } else {
    subjectButtons.push(
      { key: 'korean_hw', label: '국어' },
      { key: 'math_stat', label: '수학' },
    )
  }

  subjectButtons.push(
    { key: 'english', label: '영어' },
    { key: 'history', label: '한국사' },
  )

  // 탐구 버튼
  if (grade === 1) {
    subjectButtons.push(
      { key: 'explore1', label: '통합사회' },
      { key: 'explore2', label: '통합과학' },
    )
  } else if (grade && grade >= 2) {
    if (explorationSubjects[0]) {
      subjectButtons.push({ key: 'explore1', label: explorationSubjects[0] })
    }
    if (explorationSubjects[1]) {
      subjectButtons.push({ key: 'explore2', label: explorationSubjects[1] })
    }
  }

  // 제2외국어 버튼 (고3만, 데이터가 있거나 현재 선택되어 있으면 표시)
  const hasSecondLangData =
    grade === 3 &&
    (secondLang || Object.values(savedData).some((v) => v.secondLang != null))

  if (grade === 3 && hasSecondLangData) {
    subjectButtons.push({
      key: 'secondLang',
      label: secondLang || '제2외국어',
    })
  }

  // ---------------------------------------------
  // ⭐ 선택된 과목의 월별 점수 그래프 데이터
  // ---------------------------------------------
  const chartData =
    grade && selectedSubject
      ? (gradeMonths[grade]
          .map((month) => {
            const entry = savedData[month]
            if (!entry) return null

            let value: number | null = null
            switch (selectedSubject.key) {
              case 'korean_hw':
                if (
                  entry.koreanType === '화법과작문' ||
                  selectedSubject.label === '국어'
                ) {
                  value = entry.korean ?? null
                }
                break

              case 'korean_em':
                if (entry.koreanType === '언어와매체') {
                  value = entry.korean ?? null
                }
                break

              case 'math_stat':
                if (
                  entry.mathType === '확률과통계' ||
                  selectedSubject.label === '수학'
                ) {
                  value = entry.math ?? null
                }
                break

              case 'math_calc':
                if (entry.mathType === '미적분') {
                  value = entry.math ?? null
                }
                break

              case 'math_geo':
                if (entry.mathType === '기하') {
                  value = entry.math ?? null
                }
                break

              case 'english':
                value = entry.english ?? null
                break

              case 'history':
                value = entry.history ?? null
                break

              case 'explore1':
                if (entry.explore1Name === selectedSubject.label) {
                  value = entry.explore1 ?? null
                }
                break

              case 'explore2':
                if (entry.explore2Name === selectedSubject.label) {
                  value = entry.explore2 ?? null
                }
                break

              case 'secondLang':
                if (entry.secondLangName === selectedSubject.label) {
                  value = entry.secondLang ?? null
                }
                break
            }

            if (value == null) return null
            return { name: month, score: value }
          })
          .filter(Boolean) as { name: string; score: number }[])
      : []

  return (
    <div className={`page-wrap ${darkMode ? 'dark' : ''}`}>
      <h1 className="title">모의고사 성적 계산기</h1>
      <p className="subtitle">원점수 기준 등급을 확인하세요</p>

      {/* 년도 선택 (드롭다운) */}
      <div style={{ marginTop: 15 }}>
        <label style={{ marginRight: 10, fontWeight: 600 }}>년도 선택</label>

        <select
          value={year}
          onChange={(e) => {
            const selectedYear = Number(e.target.value)
            setYear(selectedYear)
            if (grade) loadSavedScores(grade, selectedYear)
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${darkMode ? '#334155' : '#ccc'}`,
            fontSize: 14,
            background: darkMode ? '#020617' : '#fff',
            color: darkMode ? '#e5e7eb' : '#111827',
          }}
        >
          {yearRange.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>

      {/* 학년 선택 */}
      <div className="grade-tabs">
        {[1, 2, 3].map((g) => (
          <button
            key={g}
            className={`grade-btn ${grade === g ? 'active' : ''}`}
            onClick={() => handleGradeSelect(g)}
          >
            {g}학년
          </button>
        ))}
      </div>

      {/* 월 선택 */}
      {grade && (
        <div className="month-tabs">
          {months.map((m) => (
            <button
              key={m}
              className={`month-btn ${selectedMonth === m ? 'active' : ''}`}
              onClick={() => handleMonthSelect(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* 안내 */}
      {!selectedMonth && grade && (
        <p style={{ marginTop: 20, color: '#666' }}>
          모의고사 월을 선택해주세요.
        </p>
      )}

      {/* ---------------------------- */}
      {/* 점수 입력 영역 */}
      {/* ---------------------------- */}
      {selectedMonth && (
        <div className="grid">
          {/* 왼쪽 입력 */}
          <div className="card">
            <h2 className="section-title">필수 과목</h2>

            <div className="input-group">
              <div className="input-box">
                <label>
                  국어 (100점)
                  {grade === 3 && koreanType && ` - ${koreanType}`}
                </label>

                {grade === 3 && (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      {['화법과작문', '언어와매체'].map((type) => {
                        const active = koreanType === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setKoreanType(type)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              border: active
                                ? '2px solid #e74c3c'
                                : `1px solid ${darkMode ? '#334155' : '#ccc'}`,
                              background: active
                                ? darkMode
                                  ? '#451a1a'
                                  : '#fdecea'
                                : darkMode
                                  ? '#020617'
                                  : '#fff',
                              color: darkMode ? '#e5e7eb' : '#111827',
                              cursor: 'pointer',
                            }}
                          >
                            {type}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                <input
                  type="number"
                  value={scores.korean}
                  onChange={(e) =>
                    setScores({ ...scores, korean: e.target.value })
                  }
                />
              </div>

              <div className="input-box">
                <label>
                  수학 (100점)
                  {grade === 3 && mathType && ` - ${mathType}`}
                </label>

                {grade === 3 && (
                  <>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      {['확률과통계', '미적분', '기하'].map((type) => {
                        const active = mathType === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setMathType(type)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              border: active
                                ? '2px solid #3498db'
                                : `1px solid ${darkMode ? '#334155' : '#ccc'}`,
                              background: active
                                ? darkMode
                                  ? '#0b253f'
                                  : '#eaf4ff'
                                : darkMode
                                  ? '#020617'
                                  : '#fff',
                              color: darkMode ? '#e5e7eb' : '#111827',
                              cursor: 'pointer',
                            }}
                          >
                            {type}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                <input
                  type="number"
                  value={scores.math}
                  onChange={(e) =>
                    setScores({ ...scores, math: e.target.value })
                  }
                />
              </div>

              <div className="input-box">
                <label>영어 (100점)</label>
                <input
                  type="number"
                  value={scores.english}
                  onChange={(e) =>
                    setScores({ ...scores, english: e.target.value })
                  }
                />
              </div>

              <div className="input-box">
                <label>한국사 (50점)</label>
                <input
                  type="number"
                  value={scores.history}
                  onChange={(e) =>
                    setScores({ ...scores, history: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ---------------------------------- */}
            {/* 탐구 영역 - 학년별 다르게 표시 */}
            {/* ---------------------------------- */}
            {grade === 1 && (
              <>
                <h2 className="section-title" style={{ marginTop: 30 }}>
                  탐구 영역 (필수)
                </h2>

                <div className="input-box">
                  <label>통합사회 (50점)</label>
                  <input
                    type="number"
                    value={exploreScores.sub1}
                    onChange={(e) =>
                      setExploreScores({
                        ...exploreScores,
                        sub1: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="input-box" style={{ marginTop: 10 }}>
                  <label>통합과학 (50점)</label>
                  <input
                    type="number"
                    value={exploreScores.sub2}
                    onChange={(e) =>
                      setExploreScores({
                        ...exploreScores,
                        sub2: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            {grade === 2 && (
              <>
                <h2 className="section-title" style={{ marginTop: 30 }}>
                  탐구 영역
                </h2>

                <div className="explore-tabs">
                  {['사회탐구', '과학탐구'].map((area) => (
                    <button
                      key={area}
                      className={`explore-btn ${
                        explorationArea === area ? 'active' : ''
                      }`}
                      onClick={() => {
                        setExplorationArea(area)
                        setExplorationSubjects([])
                        setExploreScores({ sub1: '', sub2: '' })
                      }}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {explorationArea && (
                  <div className="subject-scroll">
                    {subjects.map((s) => (
                      <label key={s} className="subject-item">
                        <input
                          type="checkbox"
                          checked={explorationSubjects.includes(s)}
                          onChange={() => toggleSubject(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {grade === 3 && (
              <>
                <h2 className="section-title" style={{ marginTop: 30 }}>
                  탐구 영역
                </h2>

                <div className="explore-tabs">
                  {['사회탐구', '과학탐구', '직업탐구'].map((area) => (
                    <button
                      key={area}
                      className={`explore-btn ${
                        explorationArea === area ? 'active' : ''
                      }`}
                      onClick={() => {
                        setExplorationArea(area)
                        setExplorationSubjects([])
                        setExploreScores({ sub1: '', sub2: '' })
                      }}
                    >
                      {area}
                    </button>
                  ))}
                </div>

                {explorationArea && (
                  <div className="subject-scroll">
                    {subjects.map((s) => (
                      <label key={s} className="subject-item">
                        <input
                          type="checkbox"
                          checked={explorationSubjects.includes(s)}
                          onChange={() => toggleSubject(s)}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 탐구 점수 입력 (2~3학년) */}
            {explorationSubjects.length > 0 && grade !== 1 && (
              <div style={{ marginTop: 20 }}>
                <h3 className="section-title">탐구 점수 입력 (50점)</h3>

                {explorationSubjects[0] && (
                  <div className="input-box">
                    <label>{explorationSubjects[0]}</label>
                    <input
                      type="number"
                      value={exploreScores.sub1}
                      onChange={(e) =>
                        setExploreScores({
                          ...exploreScores,
                          sub1: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                {explorationSubjects[1] && (
                  <div className="input-box" style={{ marginTop: 10 }}>
                    <label>{explorationSubjects[1]}</label>
                    <input
                      type="number"
                      value={exploreScores.sub2}
                      onChange={(e) =>
                        setExploreScores({
                          ...exploreScores,
                          sub2: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* 제2외국어 - 고3만 */}
            {grade === 3 && (
              <>
                <h2 className="section-title" style={{ marginTop: 30 }}>
                  제2외국어 / 한문
                </h2>

                <div className="subject-scroll small">
                  {secondLanguages.map((lang) => (
                    <label key={lang} className="subject-item">
                      <input
                        type="radio"
                        name="secondLang"
                        checked={secondLang === lang}
                        onChange={() => {
                          setSecondLang(lang)
                          setSecondLangScore('')
                        }}
                      />
                      {lang}
                    </label>
                  ))}
                </div>

                {secondLang && (
                  <div className="input-box" style={{ marginTop: 15 }}>
                    <label>{secondLang} (50점)</label>
                    <input
                      type="number"
                      value={secondLangScore}
                      onChange={(e) => setSecondLangScore(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {/* 점수 저장 버튼 */}
            <button
              style={{
                marginTop: 20,
                padding: '12px 20px',
                borderRadius: 8,
                background: '#4d8dff',
                color: '#fff',
              }}
              onClick={handleSaveScores}
            >
              점수 저장
            </button>
          </div>

          {/* 오른쪽 결과 */}
          <div className="card result">
            <h2 className="section-title">{selectedMonth} 모의고사 결과</h2>

            <div className="result-table">
              <table>
                <thead>
                  <tr>
                    <th>과목</th>
                    <th>점수</th>
                    <th>등급</th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>국어</td>
                    <td>{scores.korean || '-'}</td>
                    <td>{getRawGrade(scores.korean)}</td>
                  </tr>

                  <tr>
                    <td>수학</td>
                    <td>{scores.math || '-'}</td>
                    <td>{getRawGrade(scores.math)}</td>
                  </tr>

                  <tr>
                    <td>영어</td>
                    <td>{scores.english || '-'}</td>
                    <td>{getEnglishGrade(scores.english)}</td>
                  </tr>

                  <tr>
                    <td>한국사</td>
                    <td>{scores.history || '-'}</td>
                    <td>{getHistoryGrade(scores.history)}</td>
                  </tr>

                  {/* 1학년 탐구 */}
                  {grade === 1 && (
                    <>
                      <tr>
                        <td>통합사회</td>
                        <td>{exploreScores.sub1 || '-'}</td>
                        <td>{getExploreGrade(exploreScores.sub1)}</td>
                      </tr>

                      <tr>
                        <td>통합과학</td>
                        <td>{exploreScores.sub2 || '-'}</td>
                        <td>{getExploreGrade(exploreScores.sub2)}</td>
                      </tr>
                    </>
                  )}

                  {/* 2~3학년 탐구 */}
                  {grade !== 1 && explorationSubjects[0] && (
                    <tr>
                      <td>{explorationSubjects[0]}</td>
                      <td>{exploreScores.sub1 || '-'}</td>
                      <td>{getExploreGrade(exploreScores.sub1)}</td>
                    </tr>
                  )}

                  {grade !== 1 && explorationSubjects[1] && (
                    <tr>
                      <td>{explorationSubjects[1]}</td>
                      <td>{exploreScores.sub2 || '-'}</td>
                      <td>{getExploreGrade(exploreScores.sub2)}</td>
                    </tr>
                  )}

                  {/* 제2외국어 */}
                  {grade === 3 && secondLang && (
                    <tr>
                      <td>{secondLang}</td>
                      <td>{secondLangScore || '-'}</td>
                      <td>{getSecondLangGrade(secondLangScore)}</td>
                    </tr>
                  )}

                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      평균 등급
                    </td>
                    <td style={{ fontWeight: 700, color: '#2563EB' }}>
                      {calculateAverageGrade()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 20 }}>
              <h3
                style={{
                  fontSize: 14,
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                🎯 더 자세한 입시 분석
              </h3>

              <p style={{ fontSize: 13, marginBottom: 12, color: '#6B7280' }}>
                현재 평균 등급 기준으로 입시 가능성을 확인해보세요
              </p>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() =>
                    window.open('https://www.jinhak.com/', '_blank')
                  }
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#334155' : '#ccc'}`,
                    background: darkMode ? '#020617' : '#fff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4d8dff'
                    e.currentTarget.style.color = '#fff'
                    e.currentTarget.style.borderColor = '#4d8dff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? '#020617'
                      : '#fff'
                    e.currentTarget.style.color = darkMode
                      ? '#e5e7eb'
                      : '#111827'
                    e.currentTarget.style.borderColor = darkMode
                      ? '#334155'
                      : '#ccc'
                  }}
                >
                  진학사 분석 보기
                </button>

                <button
                  onClick={() => window.open('https://www.uway.com/', '_blank')}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#334155' : '#ccc'}`,
                    background: darkMode ? '#020617' : '#fff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#4d8dff'
                    e.currentTarget.style.color = '#fff'
                    e.currentTarget.style.borderColor = '#4d8dff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = darkMode
                      ? '#020617'
                      : '#fff'
                    e.currentTarget.style.color = darkMode
                      ? '#e5e7eb'
                      : '#111827'
                    e.currentTarget.style.borderColor = darkMode
                      ? '#334155'
                      : '#ccc'
                  }}
                >
                  유웨이 분석 보기
                </button>
              </div>

              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                ※ 실제 합격 여부는 대학별 반영 비율에 따라 달라질 수 있습니다.
              </p>

              {/* 🎓 대학 / 학과 검색 */}
              <div style={{ marginTop: 30 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                  🎓 대학교 검색
                </h3>

                <p style={{ fontSize: 13, marginBottom: 12, color: '#6B7280' }}>
                  입시분석을 통해 가고싶은 대학을 검색해보세요
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    placeholder="대학교 (예: 연세대학교)"
                    value={univKeyword}
                    onChange={(e) => {
                      const value = e.target.value
                      setUnivKeyword(value)

                      if (!value) {
                        setSuggestions([]) // ⭐ 추가
                        return
                      }

                      fetchSuggestions(value)
                    }}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: '1px solid #ccc',
                      fontSize: 13,
                    }}
                  />

                  {suggestions.length > 0 && univKeyword && (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#666',
                          marginBottom: 5,
                        }}
                      >
                        추천 검색
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          overflowX: 'auto',
                          gap: 8,
                          flexWrap: 'nowrap',
                          WebkitOverflowScrolling: 'touch',
                          paddingBottom: 4,
                        }}
                      >
                        {suggestions.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setUnivKeyword(item.keyword)
                              setSuggestions([]) // ⭐ 선택하면 닫힘
                              handleSearchUniv()
                            }}
                            style={{
                              flex: '0 0 auto',
                              whiteSpace: 'nowrap',
                              border: '1px solid #ddd',
                              borderRadius: 999,
                              padding: '6px 10px',
                              fontSize: 12,
                              background: '#eef4ff',
                              cursor: 'pointer',
                            }}
                          >
                            {item.keyword}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSearchUniv}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      background: '#4d8dff',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    검색
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {recentSearches.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#666',
                          marginBottom: 5,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>검색 기록</span>

                        {/* 🔥 전체 삭제 */}
                        <button
                          onClick={deleteAllSearch}
                          style={{
                            fontSize: 11,
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          전체삭제
                        </button>
                      </div>

                      <div
                        className="horizontal-scroll"
                        style={{
                          display: 'flex',
                          overflowX: 'auto',
                          gap: 8,
                          flexWrap: 'nowrap',
                          WebkitOverflowScrolling: 'touch',
                          paddingBottom: 4,
                        }}
                      >
                        {recentSearches.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => {
                              setUnivKeyword(item.keyword)
                              handleSearchUniv()
                            }}
                            style={{
                              display: 'flex',
                              flex: '0 0 auto',
                              whiteSpace: 'nowrap',
                              alignItems: 'center',
                              border: '1px solid #ddd',
                              borderRadius: 999,
                              padding: '6px 10px',
                              fontSize: 12,
                              background: '#f9fafb',
                              cursor: 'pointer', // ⭐ 추가
                            }}
                          >
                            {/* 검색 클릭 */}
                            <span
                              onClick={() => {
                                setUnivKeyword(item.keyword)
                                handleSearchUniv() // ⭐ 추가
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              {item.keyword}
                            </span>

                            {/* 🔥 삭제 버튼 */}
                            <span
                              onClick={(e) => {
                                e.stopPropagation() // ⭐ 핵심
                                deleteSearch(item.id)
                              }}
                              style={{
                                marginLeft: 6,
                                color: '#999',
                                cursor: 'pointer',
                              }}
                            >
                              ✕
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 결과 */}
                <div
                  style={{
                    marginTop: 15,
                    maxHeight: '260px', // ⭐ 핵심
                    overflowY: 'auto', // ⭐ 핵심
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  {results.map((r, i) => (
                    <div
                      key={i}
                      onClick={() => r.link && window.open(r.link, '_blank')}
                      style={{
                        fontSize: 13,
                        marginBottom: 10,
                        padding: 10,
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        cursor: 'pointer', // ⭐ 중요
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>🎓 {r.school}</div>

                      <div style={{ fontSize: 12, color: '#666' }}>
                        📍 {r.region}
                      </div>

                      <div style={{ fontSize: 12 }}>🏫 {r.type}</div>

                      <div style={{ fontSize: 12 }}>📌 {r.address}</div>

                      <div
                        style={{ fontSize: 12, color: '#2563EB', marginTop: 4 }}
                      >
                        🔗 홈페이지 바로가기
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* 📊 과목별 성적 변화 그래프 (페이지 맨 아래 카드) */}
      {/* ===================================================== */}
      {grade && (
        <div className="card" style={{ marginTop: 40 }}>
          <h2 className="section-title">과목별 성적 변화 그래프</h2>

          {/* 과목 선택 버튼들 */}
          <div className="subject-scroll-x">
            {subjectButtons.map((btn) => {
              const active =
                selectedSubject?.key === btn.key &&
                selectedSubject?.label === btn.label

              return (
                <button
                  key={`${btn.key}-${btn.label}`}
                  onClick={() => setSelectedSubject(btn)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 999,
                    flex: '0 0 auto',
                    border: active
                      ? `2px solid ${subjectColors[btn.key]}`
                      : `1px solid ${darkMode ? '#4b5563' : '#ddd'}`,
                    background: active
                      ? darkMode
                        ? '#111827'
                        : '#f5f9ff'
                      : darkMode
                        ? '#020617'
                        : '#fff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {btn.label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setChartType('line')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border:
                  chartType === 'line'
                    ? '2px solid #4d8dff'
                    : `1px solid ${darkMode ? '#4b5563' : '#ccc'}`,
                background:
                  chartType === 'line'
                    ? darkMode
                      ? '#111827'
                      : '#eef4ff'
                    : darkMode
                      ? '#020617'
                      : '#fff',
                color: darkMode ? '#e5e7eb' : '#111827',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              꺾은선 그래프
            </button>

            <button
              onClick={() => setChartType('bar')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border:
                  chartType === 'bar'
                    ? '2px solid #4d8dff'
                    : `1px solid ${darkMode ? '#4b5563' : '#ccc'}`,
                background:
                  chartType === 'bar'
                    ? darkMode
                      ? '#111827'
                      : '#eef4ff'
                    : darkMode
                      ? '#020617'
                      : '#fff',
                color: darkMode ? '#e5e7eb' : '#111827',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              막대 그래프
            </button>
          </div>

          {/* 그래프 영역 */}
          {selectedSubject && chartData.length > 0 ? (
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={darkMode ? '#1f2937' : '#e0e0e0'}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={darkMode ? '#9ca3af' : '#4b5563'}
                      tick={{ fill: darkMode ? '#e5e7eb' : '#111827' }}
                      tickLine={{ stroke: darkMode ? '#4b5563' : '#ccc' }}
                    />
                    <YAxis
                      stroke={darkMode ? '#9ca3af' : '#4b5563'}
                      tick={{ fill: darkMode ? '#e5e7eb' : '#111827' }}
                      tickLine={{ stroke: darkMode ? '#4b5563' : '#ccc' }}
                      domain={[
                        0,
                        [
                          'history',
                          'explore1',
                          'explore2',
                          'secondLang',
                        ].includes(selectedSubject.key)
                          ? 50
                          : 100,
                      ]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#020617' : '#ffffff',
                        borderColor: darkMode ? '#4b5563' : '#e5e7eb',
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                      labelStyle={{
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                      itemStyle={{
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={subjectColors[selectedSubject.key]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={darkMode ? '#1f2937' : '#e0e0e0'}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={darkMode ? '#9ca3af' : '#4b5563'}
                      tick={{ fill: darkMode ? '#e5e7eb' : '#111827' }}
                      tickLine={{ stroke: darkMode ? '#4b5563' : '#ccc' }}
                    />
                    <YAxis
                      stroke={darkMode ? '#9ca3af' : '#4b5563'}
                      tick={{ fill: darkMode ? '#e5e7eb' : '#111827' }}
                      tickLine={{ stroke: darkMode ? '#4b5563' : '#ccc' }}
                      domain={[
                        0,
                        [
                          'history',
                          'explore1',
                          'explore2',
                          'secondLang',
                        ].includes(selectedSubject.key)
                          ? 50
                          : 100,
                      ]}
                    />
                    <Tooltip
                      cursor={false} // ⭐ 이 줄 추가: 하얀 배경(커서) 제거
                      contentStyle={{
                        backgroundColor: darkMode ? '#020617' : '#ffffff',
                        borderColor: darkMode ? '#4b5563' : '#e5e7eb',
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                      labelStyle={{
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                      itemStyle={{
                        color: darkMode ? '#e5e7eb' : '#111827',
                      }}
                    />
                    <Bar
                      dataKey="score"
                      fill={subjectColors[selectedSubject.key]}
                      radius={[6, 6, 0, 0]}
                      barSize={25}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ marginTop: 10, color: '#888', fontSize: 13 }}>
              {selectedSubject
                ? '선택한 과목의 저장된 성적이 아직 없습니다. 점수를 입력하고 "점수 저장"을 눌러주세요.'
                : '그래프를 보고 싶은 과목을 위에서 선택해주세요.'}
            </p>
          )}
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* 반응형 스타일 */}
      {/* --------------------------------------------- */}
      <style jsx>{`
        .page-wrap {
          font-family: 'Noto Sans KR', sans-serif;
          background: #ffffff;
          min-height: 100vh;
          padding: 40px;
          margin: 20px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        @media (max-width: 768px) {
          .page-wrap {
            padding: 16px !important;
            padding-top: 72px !important;
            margin: 0 !important;
            border-radius: 0;
          }

          .card {
            padding: 16px;
          }

          .grid {
            gap: 16px;
          }

          .horizontal-scroll::-webkit-scrollbar {
            display: none;
          }
        }

        .title {
          font-size: clamp(22px, 4vw, 32px);
          font-weight: 700;
        }

        .subtitle {
          margin-top: 6px;
          color: #666;
          font-size: clamp(14px, 1.8vw, 18px);
        }

        .grade-tabs,
        .month-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .month-tabs {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .month-tabs::-webkit-scrollbar {
            display: none;
          }
        }

        .subject-scroll-x {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 768px) {
          .subject-scroll-x {
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
          }

          .subject-scroll-x::-webkit-scrollbar {
            display: none;
          }

          .result-list {
            max-height: 200px;
          }
        }

        .grade-btn,
        .month-btn {
          padding: 8px 14px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 6px;
          cursor: pointer;
          font-size: clamp(12px, 1.6vw, 15px);
          white-space: nowrap; /* ⭐ 버튼 텍스트 줄바꿈 방지 */
          flex: 0 0 auto; /* ⭐ 줄어드는 것 방지 */
        }

        .grade-btn.active,
        .month-btn.active {
          background: #4d8dff;
          color: white;
          border-color: #4d8dff;
        }

        /* PC: 2 컬럼 */
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        /* 모바일: 1 컬럼 */
        @media (max-width: 768px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .card {
            margin-bottom: 20px;
          }

          .result {
            order: 99;
          }
        }

        .card {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          font-size: clamp(16px, 2vw, 20px);
          font-weight: 700;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-top: 10px;
        }

        .input-box label {
          display: block;
          margin-bottom: 4px;
          font-size: clamp(12px, 1.6vw, 16px);
          font-weight: 500;
        }

        .input-box input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
        }

        .explore-tabs {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        .explore-btn {
          padding: 10px 16px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 6px;
          cursor: pointer;
          font-size: clamp(12px, 1.6vw, 16px);
        }

        .explore-btn.active {
          background: #4d8dff;
          color: white;
        }

        .subject-scroll {
          margin-top: 12px;
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: 8px;
          max-height: 180px;
          overflow-y: auto;
        }

        .subject-scroll.small {
          max-height: 130px;
        }

        .subject-item {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
          font-size: clamp(12px, 1.6vw, 16px);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: clamp(12px, 1.4vw, 16px);
        }

        th,
        td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: center;
        }

        th {
          background: #f0f0f0;
        }

        /* 모달 전체 배경 */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        /* 모달 박스 */
        .modal-box {
          background: #ffffff;
          padding: 22px 28px;
          border-radius: 12px;
          border: 2px solid #4d8dff; /* 기본 블루 */
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
          text-align: center;
          animation: fadeIn 0.25s ease-out;
        }

        /* 체크 아이콘 */
        .modal-icon {
          font-size: 32px;
          font-weight: bold;
          color: #4d8dff;
          margin-bottom: 8px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .horizontal-scroll {
          max-width: 430px; /* 💻 PC: 5개 정도 */
        }

        @media (max-width: 768px) {
          .horizontal-scroll {
            max-width: 260px; /* 📱 모바일: 3개 */
          }
        }

        /* ================================== */
        /* 🌙 다크모드용 스타일 오버라이드   */
        /* ================================== */
        .page-wrap.dark {
          background: #020617;
          color: #e5e7eb;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.7);
        }

        .page-wrap.dark .title {
          color: #38bdf8;
        }

        .page-wrap.dark .subtitle {
          color: #94a3b8;
        }

        .page-wrap.dark .card {
          background: #0f172a;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.8);
        }

        .page-wrap.dark .section-title {
          color: #e5e7eb;
        }

        .page-wrap.dark .grade-btn,
        .page-wrap.dark .month-btn {
          background: #020617;
          border-color: #1f2937;
          color: #e5e7eb;
        }

        .page-wrap.dark .grade-btn.active,
        .page-wrap.dark .month-btn.active {
          background: #4d8dff;
          color: #ffffff;
          border-color: #4d8dff;
        }

        .page-wrap.dark .input-box input {
          background: #020617;
          border-color: #334155;
          color: #e5e7eb;
        }

        .page-wrap.dark .explore-btn {
          background: #020617;
          border-color: #334155;
          color: #e5e7eb;
        }

        .page-wrap.dark .explore-btn.active {
          background: #4d8dff;
          color: #ffffff;
          border-color: #4d8dff;
        }

        .page-wrap.dark .subject-scroll {
          background: #020617;
          border-color: #1f2937;
        }

        .page-wrap.dark table {
          color: #e5e7eb;
        }

        .page-wrap.dark th {
          background: #020617;
          color: #e5e7eb;
        }

        .page-wrap.dark td {
          border-color: #1f2937;
        }

        .page-wrap.dark .modal-box {
          background: #020617;
          border-color: #4d8dff;
          color: #e5e7eb;
        }
      `}</style>
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">✔</div>
            <p>점수가 저장되었습니다!</p>
          </div>
        </div>
      )}
    </div>
  )
}
