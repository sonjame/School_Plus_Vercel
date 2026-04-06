//학교인증

'use client'

import React, { useRef, useState, useEffect } from 'react'

async function resizeImage(file: File): Promise<Blob> {
  const img = new Image()
  const url = URL.createObjectURL(file)

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas')

      const MAX_WIDTH = 1600
      const scale = MAX_WIDTH / img.width

      canvas.width = MAX_WIDTH
      canvas.height = img.height * scale

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
        },
        'image/jpeg',
        0.85,
      )
    }
    img.src = url
  })
}

function normalizeDate(s: string | null | undefined) {
  if (!s) return ''

  const digits = s.replace(/[^0-9]/g, '')

  if (digits.length !== 8) return ''

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#f5f7fb',
    fontFamily: 'Arial, sans-serif',
    padding: 'clamp(24px, 6vw, 80px) clamp(12px, 4vw, 20px) 40px',
    minHeight: '100vh',
  },

  layout: {
    maxWidth: 1200,
    margin: 'clamp(24px, 6vw, 20px) auto', // 🔥 PC에서 위 여백 감소
    padding: '0 clamp(6px, 3vw, 24px)',
  },

  card: {
    maxWidth: 'min(960px, 100%)', // 🔥 모바일에서는 사실상 풀폭
    margin: '0 auto',
    background: '#fff',
    borderRadius: 24,
    padding: 'clamp(16px, 4vw, 40px)', // 🔥 모바일 패딩 더 감소
    boxShadow: '0 8px 30px rgba(15,23,42,0.12)',
  },

  title: { fontSize: 25, fontWeight: 700 },
  subtitle: {
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    color: '#6b7280',
    marginTop: 6,
  },

  infoBox: {
    background: '#d8eaff',
    border: '1px solid #aacbff',
    padding: 16,
    borderRadius: 14,
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    margin: '20px 0',
    color: '#374151',
    lineHeight: 1.5,
  },

  noteBox: {
    background: '#e4efff',
    border: '1px solid #b4ccff',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    color: '#374151',
  },

  sectionTitle: {
    fontWeight: 700,
    marginBottom: 10,
    fontSize: 'clamp(13px, 2.8vw, 15px)',
    marginTop: 20,
  },

  uploadArea: {
    border: '2px dashed #9bbcff',
    background: '#e4efff',
    borderRadius: 18,
    height: 'clamp(260px, 45vw, 440px)',
    width: '100%',
    maxWidth: '100%',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },

  previewImg: {
    maxWidth: '100%',
    borderRadius: 12,
    marginTop: 16,
  },
  deleteBtn: {
    marginTop: 10,
    padding: '8px 14px',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  nextBtn: {
    marginTop: 24,
    width: '100%',
    padding: 14,
    background: '#4a74f5',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },

  previewWrapper: {
    width: '100%',
    height: 'clamp(260px, 45vw, 440px)', // uploadArea와 동일
    marginTop: 16,
    borderRadius: 18,
    background: '#f1f5f9',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },

  previewImgFit: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: 12,
  },
}

const SchoolAuthPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [ocrRawText, setOcrRawText] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [schoolInput, setSchoolInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [birthDate, setBirthDate] = useState('') // YYYY-MM-DD
  const [validFrom, setValidFrom] = useState('') // 시작일
  const [validTo, setValidTo] = useState('') // 종료일

  /* 🌙 다크모드 상태 */
  const [darkMode, setDarkMode] = useState(false)

  /* 🌙 다크모드 초기 로드 (user별 theme_settings) */
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

  /* 🌙 다른 컴포넌트에서 theme-change 이벤트 쏠 때 동기화 */
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.darkMode !== undefined) {
        setDarkMode(e.detail.darkMode)
      }
    }

    window.addEventListener('theme-change', handler)
    return () => window.removeEventListener('theme-change', handler)
  }, [])

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setNameInput('')
    setSchoolInput('')
    setBirthDate('')
    setValidFrom('')
    setValidTo('')

    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNext = async () => {
    if (!file) return

    try {
      setError(null)

      // ✅ 이미지 전처리 (핵심)
      const resized = await resizeImage(file)

      const formData = new FormData()
      formData.append('image', resized, 'image.jpg')

      const res = await fetch('/api/vision/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('OCR 실패')

      const { text } = await res.json()

      setOcrRawText(text || '')

      const parsed1 = parseStudentCard(text)
      const parsed2 = parseFieldsFromRawText(text)

      const merged = {
        ...parsed1,
        ...parsed2,
      }

      console.log('birth:', merged.birth, merged.birthDate)

      setNameInput(merged.name ?? '')
      setSchoolInput(merged.school ?? '')
      setBirthDate(normalizeDate(merged.birth || merged.birthDate))

      setValidFrom(normalizeDate(merged.expiryStart || merged.validFrom))

      setValidTo(normalizeDate(merged.expiry || merged.validTo))
    } catch {
      setError('학생증을 다시 촬영해 주세요.')
    }
  }

  function extractAllDates(rawText: string): string[] {
    const re =
      /(19\d{2}|20\d{2})[.\-/ ]?(0?\d|1[0-2])[.\-/ ]?(0?\d|[12]\d|3[01])/g

    const found: string[] = []
    let m: RegExpExecArray | null

    while ((m = re.exec(rawText)) !== null) {
      const digits = m[0].replace(/[^0-9]/g, '')
      if (digits.length === 8) {
        found.push(
          `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
        )
      }
    }

    return Array.from(new Set(found))
  }

  function parseFieldsFromRawText(rawText: string) {
    const text = rawText.replace(/\u00A0/g, ' ')

    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    const school = lines.find((l) => /고등학교|중학교|초등학교/.test(l)) ?? ''

    let name = ''
    const nameLine = lines.find((l) => /이름/.test(l))

    if (nameLine) {
      const m = nameLine.match(/이름\s*[:\-]?\s*([가-힣]{2,4})/)
      if (m?.[1]) name = m[1]
    }

    if (!name) {
      const candidate = lines.find((l) => /^[가-힣]{2,4}$/.test(l))
      if (candidate) name = candidate
    }

    const dates = extractAllDates(text)

    return {
      name,
      school,
      birth: dates[0] ?? '',
      expiryStart: dates[1] ?? '',
      expiry: dates[2] ?? '',
    }
  }

  function parseStudentCard(text: string) {
    const normalized = text
      .replace(/[^\uAC00-\uD7A3a-zA-Z0-9.\-\/\s]/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let name: string | null = null
    let birthDate: string | null = null
    let validFrom: string | null = null
    let validTo: string | null = null

    const LAST_NAMES =
      '김이박최정강조윤장임한오서신권황안송전홍유고문양손'.split('')

    /* ✅ 1️⃣ 띄어쓴 이름 (박 유 나 / 홍 길동 등 공백 유연) */
    const spaced = normalized.match(
      /([김이박최정강조윤장임한오서신권황안송전홍유고문양손])\s*([가-힣])\s*([가-힣])/,
    )
    if (spaced) {
      name = spaced[1] + spaced[2] + spaced[3]
    }

    /* ✅ 2️⃣ 붙어있는 3글자 이름 허용 (박유나 / 홍길동) */
    if (!name) {
      const seq = normalized.replace(/\s/g, '')
      for (let i = 0; i <= seq.length - 3; i++) {
        const candidate = seq.slice(i, i + 3)
        if (
          LAST_NAMES.includes(candidate[0]) &&
          candidate[1] !== candidate[2] // 이아아 같은 오류 방지
        ) {
          name = candidate
          break
        }
      }
    }

    /* ✅ 학교 */
    const schoolMatch = normalized.match(/([가-힣]{2,}(중학교|고등학교))/)

    /* ✅ 생년월일 (키워드 기반) */
    const birthMatch = normalized.match(
      /생년월일\s*(19|20\d{2})[.\-/\s]*(\d{1,2})[.\-/\s]*(\d{1,2})/,
    )

    if (birthMatch) {
      const y = birthMatch[1]
      const m = birthMatch[2].padStart(2, '0')
      const d = birthMatch[3].padStart(2, '0')
      birthDate = `${y}-${m}-${d}`
    }

    /* ✅ 유효기간 (시작일 ~ 종료일) */
    const validMatch = normalized.match(
      /유효기간\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*(\d{2})\s*(\d{2})/,
    )

    if (validMatch) {
      const startYear = `20${validMatch[1]}`
      const startMonth = validMatch[2].padStart(2, '0')
      const startDay = validMatch[3].padStart(2, '0')

      const endYear = `20${validMatch[4]}`
      const endMonth = validMatch[5].padStart(2, '0')
      const endDay = validMatch[6].padStart(2, '0')

      validFrom = `${startYear}-${startMonth}-${startDay}`
      validTo = `${endYear}-${endMonth}-${endDay}`
    }

    // ✅ fallback 이름 (추가)
    if (!name) {
      const candidate = normalized
        .split(' ')
        .find((l) => /^[가-힣]{2,4}$/.test(l))

      if (candidate) name = candidate
    }

    // ✅ fallback 날짜 (추가)
    const dates = extractAllDates(text)

    if (!birthDate && dates.length > 0) {
      birthDate = dates[0]
    }

    if (!validFrom && dates.length >= 2) {
      validFrom = dates[1]
    }

    if (!validTo && dates.length >= 3) {
      validTo = dates[2]
    }

    return {
      name,
      school: schoolMatch ? schoolMatch[1] : null,
      birthDate,
      validFrom,
      validTo,
    }
  }

  return (
    <div
      style={{
        ...styles.page,
        background: darkMode ? '#020617' : '#f5f7fb',
        color: darkMode ? '#e5e7eb' : '#111827',
      }}
    >
      <div style={styles.layout}>
        <div
          style={{
            ...styles.card,
            background: darkMode ? '#020617' : '#ffffff',
            color: darkMode ? '#e5e7eb' : '#111827',
            boxShadow: darkMode
              ? '0 16px 40px rgba(15,23,42,0.9)'
              : '0 8px 30px rgba(15,23,42,0.12)',
            border: darkMode ? '1px solid #1f2937' : 'none',
          }}
        >
          <h2 style={styles.title}>학교 인증</h2>
          <div
            style={{
              ...styles.subtitle,
              color: darkMode ? '#9ca3af' : '#6b7280',
            }}
          >
            학생증 사진을 업로드하여 학교를 인증하세요
          </div>

          <div
            style={{
              ...styles.infoBox,
              background: darkMode ? '#0b1220' : '#d8eaff',
              border: `1px solid ${darkMode ? '#1d4ed8' : '#aacbff'}`,
              color: darkMode ? '#e5e7eb' : '#374151',
            }}
          >
            학교 인증을 완료하면 안전한 학교 커뮤니티를 이용할 수 있습니다.
            <br />
            학생증 사진을 업로드하고 다음 단계 버튼을 눌러서 진행해주세요.
          </div>

          <div
            style={{
              ...styles.noteBox,
              background: darkMode ? '#020617' : '#e4efff',
              border: `1px solid ${darkMode ? '#1d4ed8' : '#b4ccff'}`,
              color: darkMode ? '#e5e7eb' : '#374151',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 6 }}>안내사항</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>학생증에서 학교명과 이름이 명확하게 보여야 합니다.</li>
              <li>인증 후 학생증 사진은 자동으로 삭제됩니다.</li>
            </ul>
          </div>

          <div
            style={{
              ...styles.sectionTitle,
              color: darkMode ? '#e5e7eb' : '#111827',
            }}
          >
            🖼 학생증 사진 업로드
          </div>

          {!previewUrl && (
            <div
              style={{
                ...styles.uploadArea,
                background: darkMode ? '#020617' : '#e4efff',
                borderColor: darkMode ? '#2563eb' : '#9bbcff',
                color: darkMode ? '#e5e7eb' : '#1f2937',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              학생증 사진 선택
            </div>
          )}

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setFile(f)
              setPreviewUrl(URL.createObjectURL(f))
            }}
          />

          {previewUrl && (
            <>
              <div
                style={{
                  ...styles.previewWrapper,
                  background: darkMode ? '#020617' : '#f1f5f9',
                  borderColor: darkMode ? '#1f2937' : '#e5e7eb',
                }}
              >
                <img
                  src={previewUrl}
                  alt="학생증 미리보기"
                  style={styles.previewImgFit}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
              >
                <button style={styles.deleteBtn} onClick={handleRemoveImage}>
                  사진 삭제
                </button>
              </div>
            </>
          )}

          <button
            style={{
              ...styles.nextBtn,
              background: '#4f46e5',
              boxShadow: darkMode
                ? '0 8px 24px rgba(79,70,229,0.7)'
                : '0 6px 18px rgba(79,70,229,0.45)',
            }}
            onClick={handleNext}
          >
            다음 단계
          </button>

          {ocrRawText && (
            <div
              style={{
                marginTop: 20,
                padding: 14,
                borderRadius: 12,
                background: darkMode ? '#111827' : '#f3f4f6',
                border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 8,
                  fontSize: 13,
                  color: darkMode ? '#e5e7eb' : '#111827',
                }}
              >
                📄 OCR 원본 텍스트 (디버그)
              </div>

              <div
                style={{
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5,
                  color: darkMode ? '#9ca3af' : '#374151',
                }}
              >
                {ocrRawText}
              </div>
            </div>
          )}

          {(nameInput || schoolInput) && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                borderRadius: 16,
                background: darkMode ? '#020617' : '#eef2ff',
                border: `1px solid ${darkMode ? '#312e81' : '#c7d2fe'}`,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 10,
                  fontSize: 15,
                  color: darkMode ? '#a5b4fc' : '#3730a3',
                }}
              >
                ✅ 인식된 학생 정보
              </div>

              <div style={{ fontSize: 14, marginBottom: 6 }}>
                👤 이름:{' '}
                <strong>{nameInput ? nameInput : '인식되지 않음'}</strong>
              </div>

              <div style={{ fontSize: 14 }}>
                🏫 학교:{' '}
                <strong>{schoolInput ? schoolInput : '인식되지 않음'}</strong>
              </div>

              <div style={{ fontSize: 14, marginBottom: 6 }}>
                🎂 생년월일: <strong>{birthDate || '미입력'}</strong>
              </div>

              <div style={{ fontSize: 14 }}>
                🪪 학생증 유효기간:{' '}
                <strong>
                  {validFrom && validTo
                    ? `${validFrom} ~ ${validTo}`
                    : '미입력'}
                </strong>
              </div>

              <p
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: darkMode ? '#9ca3af' : '#6b7280',
                }}
              >
                위 정보로 학교 인증이 진행됩니다.
                <br />
                잘못 인식된 경우 직접 수정할 수 있습니다.
              </p>
            </div>
          )}

          {(nameInput || schoolInput) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 12 }}>
                👤 이름
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    width: '98%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#4b5563' : '#cccccc'}`,
                    background: darkMode ? '#020617' : '#ffffff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                🏫 학교
                <input
                  value={schoolInput}
                  onChange={(e) => setSchoolInput(e.target.value)}
                  style={{
                    width: '98%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#4b5563' : '#cccccc'}`,
                    background: darkMode ? '#020617' : '#ffffff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                🎂 생년월일
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={{
                    width: '98%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#4b5563' : '#cccccc'}`,
                    background: darkMode ? '#020617' : '#ffffff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                  }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                🪪 학생증 유효기간 (시작)
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  style={{
                    width: '98%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#4b5563' : '#cccccc'}`,
                    background: darkMode ? '#020617' : '#ffffff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                  }}
                />
              </div>

              <div>
                🪪 학생증 유효기간 (종료)
                <input
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  style={{
                    width: '98%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: `1px solid ${darkMode ? '#4b5563' : '#cccccc'}`,
                    background: darkMode ? '#020617' : '#ffffff',
                    color: darkMode ? '#e5e7eb' : '#111827',
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                color: '#f97373',
                marginTop: 16,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SchoolAuthPage
