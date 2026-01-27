//학교인증

'use client'

import React, { useRef, useState } from 'react'

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#f5f7fb',
    fontFamily: 'Arial, sans-serif',
    padding: '80px 20px 40px 20px',
    minHeight: '100vh',
  },
  layout: {
    maxWidth: 850,
    margin: '100px auto',
    padding: '0 20px',
  },
  card: {
    maxWidth: 700,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 24,
    padding: 32,
    boxShadow: '0 8px 30px rgba(15,23,42,0.12)',
  },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 6 },

  infoBox: {
    background: '#d8eaff',
    border: '1px solid #aacbff',
    padding: 14,
    borderRadius: 14,
    fontSize: 13,
    margin: '20px 0',
    color: '#374151',
    lineHeight: 1.5,
  },

  noteBox: {
    background: '#e4efff',
    border: '1px solid #b4ccff',
    padding: 12,
    borderRadius: 14,
    marginTop: 16,
    fontSize: 11,
    color: '#374151',
  },

  sectionTitle: {
    fontWeight: 700,
    marginBottom: 10,
    fontSize: 14,
    marginTop: 20,
  },

  uploadArea: {
    border: '2px dashed #9bbcff',
    background: '#e4efff',
    borderRadius: 18,
    height: 380,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'pointer',
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
}

const SchoolAuthPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [schoolInput, setSchoolInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setNameInput('')
    setSchoolInput('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleNext = async () => {
    if (!file) return

    try {
      setError(null)

      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/vision/ocr', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('OCR 실패')

      const { text } = await res.json()

      const parsed = parseStudentCard(text)
      setNameInput(parsed.name ?? '')
      setSchoolInput(parsed.school ?? '')
    } catch {
      setError('학생증을 다시 촬영해 주세요.')
    }
  }

  function parseStudentCard(text: string) {
    const normalized = text
      .replace(/[^\uAC00-\uD7A3\s]/g, ' ')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    let name: string | null = null

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

    return {
      name,
      school: schoolMatch ? schoolMatch[1] : null,
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        <div style={styles.card}>
          <h2 style={styles.title}>학교 인증</h2>
          <div style={styles.subtitle}>
            학생증 사진을 업로드하여 학교를 인증하세요
          </div>

          <div style={styles.infoBox}>
            학교 인증을 완료하면 안전한 학교 커뮤니티를 이용할 수 있습니다.
            <br />
            학생증 사진을 업로드하고 다음 단계 버튼을 눌러서 진행해주세요.
          </div>

          <div style={styles.noteBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>안내사항</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>학생증에서 학교명과 이름이 명확하게 보여야 합니다.</li>
              <li>인증 후 학생증 사진은 자동으로 삭제됩니다.</li>
            </ul>
          </div>

          <div style={styles.sectionTitle}>🖼 학생증 사진 업로드</div>

          {!previewUrl && (
            <div
              style={styles.uploadArea}
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
              <img src={previewUrl} alt="미리보기" style={styles.previewImg} />
              <button style={styles.deleteBtn} onClick={handleRemoveImage}>
                사진 삭제
              </button>
            </>
          )}

          <button style={styles.nextBtn} onClick={handleNext}>
            다음 단계
          </button>

          {(nameInput || schoolInput) && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 12 }}>
                👤 이름
                <input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                />
              </div>

              <div>
                🏫 학교
                <input
                  value={schoolInput}
                  onChange={(e) => setSchoolInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 10,
                    marginTop: 6,
                    borderRadius: 8,
                    border: '1px solid #ccc',
                  }}
                />
              </div>
            </div>
          )}

          {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}

export default SchoolAuthPage
