'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type React from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import RichTextEditor from '@/src/components/RichTextEditor'

export default function EditPostPage() {
  const params = useParams<{ id: string }>()
  const postId = params.id
  const router = useRouter()

  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  const boardKeys = [
    'board_free',
    'board_promo',
    'board_club',
    'board_grade1',
    'board_grade2',
    'board_grade3',
  ]

  const [storageKey, setStorageKey] = useState<string>('')
  const [post, setPost] = useState<any>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  /* 🔥 첨부 링크/영상 수정 */
  const [attachments, setAttachments] = useState<
    { type: 'link' | 'video'; url: string }[]
  >([])

  /* 🔥 투표 수정 상태 */
  const [voteEnabled, setVoteEnabled] = useState(false)
  const [voteOptions, setVoteOptions] = useState<string[]>([])
  const [voteEndAt, setVoteEndAt] = useState<string>('') // yyyy-mm-ddTHH:mm

  /* 모달 상태 */
  const [modal, setModal] = useState({
    show: false,
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    onConfirm: () => {},
    onCancel: () => {},
  })

  /* 모달 */
  const showAlert = (msg: string, callback?: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'alert',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        if (callback) callback()
      },
      onCancel: () => {},
    })
  }

  const showConfirm = (msg: string, yesFn: () => void) => {
    setModal({
      show: true,
      message: msg,
      type: 'confirm',
      onConfirm: () => {
        setModal((m) => ({ ...m, show: false }))
        yesFn()
      },
      onCancel: () => setModal((m) => ({ ...m, show: false })),
    })
  }

  useEffect(() => {
    setMounted(true)

    if (typeof window === 'undefined') return

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) return

    try {
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

  /* ------------------------------
     게시글 로드
  ------------------------------ */
  useEffect(() => {
    async function loadPost() {
      const storedUser = localStorage.getItem('loggedInUser')
      if (!storedUser) {
        showAlert('로그인이 필요합니다.', () => router.push('/login'))
        return
      }

      const parsed = JSON.parse(storedUser)
      const userId = parsed.id
      if (!userId) {
        showAlert('로그인이 필요합니다.', () => router.push('/login'))
        return
      }

      const res = await apiFetch(`/api/posts/${postId}`)

      if (!res.ok) {
        showAlert('수정 권한이 없습니다.', () => router.back())
        return
      }

      const data = await res.json()

      setPost(data)
      setTitle(data.title)
      setContent(data.content)
      setImages(Array.isArray(data.images) ? data.images : [])
      setAttachments(Array.isArray(data.attachments) ? data.attachments : [])

      /* 🔥 기존 투표 데이터 복원 */
      if (data.vote?.enabled) {
        setVoteEnabled(true)

        setVoteOptions(
          Array.isArray(data.vote.options)
            ? data.vote.options.map((o: any) => o.text)
            : [],
        )

        setVoteEndAt(
          data.vote.endAt
            ? data.vote.endAt.slice(0, 16) // datetime-local 형식
            : '',
        )
      } else {
        setVoteEnabled(false)
        setVoteOptions([])
        setVoteEndAt('')
      }
    }

    loadPost()
  }, [postId])

  /* 이미지 업로드 */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const res = await apiFetch('/api/upload/temp', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      showAlert('이미지 업로드 실패')
      return
    }

    const data = await res.json()

    // ⭐ temp 이미지 URL 추가
    setImages((prev) => [...prev, data.url])
  }

  /* ------------------------------
     저장하기
  ------------------------------ */
  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      showAlert('제목과 내용을 모두 입력하세요.')
      return
    }

    const storedUser = localStorage.getItem('loggedInUser')
    if (!storedUser) {
      showAlert('로그인이 필요합니다.')
      return
    }

    const parsed = JSON.parse(storedUser)
    const userId = parsed.id
    if (!userId) {
      showAlert('로그인이 필요합니다.')
      return
    }


    function cleanContent(html: string) {
      return (
        html
          // ❌ font-family 제거 줄 삭제 (폰트 유지하려면)
          // .replace(/font-family:[^;"]+;?/g, '')

          // 빈 style="" 제거
          .replace(/\sstyle=""/g, '')

          // 완전 빈 p 제거
          .replace(/<p>\s*<\/p>/g, '')
          .replace(/<p>(?:&nbsp;|\s)*<\/p>/g, '')
      )
    }

    showConfirm('정말 수정하시겠습니까?', async () => {
      const res = await apiFetch(`/api/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          content: cleanContent(content),
          images,
          attachments,
          vote: voteEnabled
            ? {
                enabled: true,
                options: voteOptions,
                endAt: voteEndAt,
              }
            : { enabled: false },
        }),
      })

      if (!res.ok) {
        showAlert('수정 실패 또는 권한이 없습니다.')
        return
      }

      showAlert('수정되었습니다!', () => {
        router.push(`/board/post/${postId}`)
      })
    })
  }

  // 🔥 SSR hydration mismatch 방지
  if (!mounted) return null

  if (!post) return <p style={{ padding: 20 }}>게시글을 찾을 수 없습니다.</p>

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded"
        rel="stylesheet"
      />

      <div
        style={{
          ...pageWrap,
          background: darkMode ? '#0f172a' : '#F3F6FA',
          color: darkMode ? '#f1f5f9' : '#111827',
        }}
      >
        <div
          style={{
            ...card,
            background: darkMode ? '#1e293b' : '#fff',
            border: darkMode ? '1px solid #334155' : '1px solid #E3EAF3',
            boxShadow: darkMode
              ? '0 10px 30px rgba(15,23,42,0.7)'
              : '0 4px 20px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'clamp(10px, 2vw, 16px)',
            }}
          >
            {/* 제목 */}
            <h2 style={{ ...titleStyle, marginBottom: 0 }}>
              <span className="material-symbols-rounded" style={titleIcon}>
                edit
              </span>
              게시글 수정
            </h2>

            {/* ❌ 수정 취소 버튼 */}
            <button
              onClick={() =>
                showConfirm('수정을 취소하시겠습니까?', () => {
                  router.push(`/board/post/${postId}`)
                })
              }
              style={{
                background: darkMode ? '#0b1220' : '#ECEFF1',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: darkMode ? '#e2e8f0' : '#546E7A',
              }}
              aria-label="수정 취소"
            >
              <span
                className="material-symbols-rounded"
                style={{ fontSize: 22 }}
              >
                close
              </span>
            </button>
          </div>

          {/* 제목 */}
          <label
            style={{
              ...label,
              color: darkMode ? '#cbd5e1' : '#37474F',
            }}
          >
            제목
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            style={{
              ...inputBox,
              background: darkMode ? '#0b1220' : '#F9FAFB',
              color: darkMode ? '#e2e8f0' : '#111827',
              border: darkMode ? '1px solid #334155' : '1px solid #CFD8DC',
            }}
          />

          {/* 내용 */}
          <label
            style={{
              ...label,
              color: darkMode ? '#cbd5e1' : '#37474F',
            }}
          >
            내용
          </label>

          <RichTextEditor
            value={content}
            onChange={setContent}
            darkMode={darkMode}
          />

          {/* 이미지 업로드 */}
          <input
            id="uploadImage"
            type="file"
            accept="image/*"
            hidden
            onChange={handleImageUpload}
          />

          <label
            htmlFor="uploadImage"
            style={{
              ...uploadBtn,
              background: darkMode ? '#0b1220' : '#E3F2FD',
              color: darkMode ? '#e0f2fe' : '#0277BD',
              border: darkMode ? '1px solid #334155' : 'none',
            }}
          >
            <span className="material-symbols-rounded" style={uploadBtnIcon}>
              image
            </span>
            사진 업로드
          </label>

          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {images.map((url, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={url}
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) => prev.filter((_, i) => i !== idx))
                    }
                    style={deleteBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 🔗 첨부 링크 / 영상 수정 */}
          <hr
            style={{
              margin: '20px 0',
              borderColor: darkMode ? '#1f2937' : '#ddd',
            }}
          />

          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            🔗 첨부 링크 / 영상
          </h3>

          {attachments.map((a, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 10,
                alignItems: 'center',
              }}
            >
              <select
                value={a.type}
                onChange={(e) => {
                  const list = [...attachments]
                  list[idx].type = e.target.value as 'link' | 'video'
                  setAttachments(list)
                }}
                style={{
                  padding: '10px',
                  borderRadius: 8,
                  border: darkMode ? '1px solid #334155' : '1px solid #ccc',
                  background: darkMode ? '#020617' : '#fff',
                  color: darkMode ? '#e2e8f0' : '#111827',
                }}
              >
                <option value="link">링크</option>
                <option value="video">유튜브</option>
              </select>

              <input
                value={a.url}
                onChange={(e) => {
                  const list = [...attachments]
                  list[idx].url = e.target.value
                  setAttachments(list)
                }}
                placeholder={
                  a.type === 'video'
                    ? 'https://youtu.be/...'
                    : 'https://example.com'
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '10px',
                  borderRadius: 8,
                  border: darkMode ? '1px solid #334155' : '1px solid #ccc',
                  background: darkMode ? '#020617' : '#fff',
                  color: darkMode ? '#e2e8f0' : '#111827',
                }}
              />

              <button
                onClick={() =>
                  setAttachments(attachments.filter((_, i) => i !== idx))
                }
                style={{
                  flexShrink: 0,
                  background: '#ff5252',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                삭제
              </button>
            </div>
          ))}

          <button
            onClick={() =>
              setAttachments([...attachments, { type: 'link', url: '' }])
            }
            style={{
              width: '100%',
              padding: '10px',
              background: darkMode ? '#020617' : '#E3F2FD',
              border: darkMode ? '1px solid #334155' : '1px solid #90CAF9',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              marginBottom: 10,
              color: darkMode ? '#e0f2fe' : '#0277BD',
            }}
          >
            + 첨부 추가
          </button>

          {/* ------------------------------- */}
          {/* 🔥 투표 수정 UI */}
          {/* ------------------------------- */}

          <hr style={{ margin: '20px 0', borderColor: '#ddd' }} />

          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            🗳 투표 수정
          </h3>

          {/* 투표 활성화 */}
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                ...label,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={voteEnabled}
                onChange={(e) => setVoteEnabled(e.target.checked)}
              />
              투표 사용하기
            </label>
          </div>

          {voteEnabled && (
            <div style={{ paddingLeft: 8 }}>
              {/* 옵션 수정 */}
              <label
                style={{
                  ...label,
                  color: darkMode ? '#cbd5e1' : '#37474F',
                }}
              >
                투표 옵션
              </label>

              {voteOptions.map((opt, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 8, marginBottom: 8 }}
                >
                  <input
                    value={opt}
                    onChange={(e) => {
                      const list = [...voteOptions]
                      list[idx] = e.target.value
                      setVoteOptions(list)
                    }}
                    placeholder={`옵션 ${idx + 1}`}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: darkMode ? '1px solid #334155' : '1px solid #ccc',
                      background: darkMode ? '#020617' : '#fff',
                      color: darkMode ? '#e2e8f0' : '#111827',
                    }}
                  />

                  <button
                    onClick={() =>
                      setVoteOptions(voteOptions.filter((_, i) => i !== idx))
                    }
                    style={{
                      background: '#ff5252',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '0 10px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    삭제
                  </button>
                </div>
              ))}

              <button
                onClick={() => setVoteOptions([...voteOptions, ''])}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: darkMode ? '#020617' : '#E3F2FD',
                  border: darkMode ? '1px solid #334155' : '1px solid #90CAF9',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginBottom: 14,
                  color: darkMode ? '#e0f2fe' : '#0277BD',
                }}
              >
                + 옵션 추가
              </button>

              {/* 마감 시간 */}
              <label
                style={{
                  ...label,
                  color: darkMode ? '#cbd5e1' : '#37474F',
                }}
              >
                투표 마감 시간
              </label>
              <input
                type="datetime-local"
                value={voteEndAt}
                onChange={(e) => setVoteEndAt(e.target.value)}
                className={darkMode ? 'datetime-input dark' : 'datetime-input'} // 🔥 추가
                style={{
                  width: '100%',
                  height: '46px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                  marginBottom: '18px',
                  border: darkMode
                    ? '1.5px solid #334155'
                    : '1.5px solid #CFD8DC',
                  background: darkMode ? '#020617' : '#FFFFFF',
                  color: darkMode ? '#e2e8f0' : '#111827',
                }}
              />
            </div>
          )}

          {/* 저장하기 */}
          <button onClick={handleSave} style={submitBtn}>
            저장하기
          </button>
        </div>
      </div>

      {/* 모달 */}
      {modal.show && (
        <div className="modal-backdrop">
          <div
            className="modal-box"
            style={{
              background: darkMode ? '#1e293b' : '#ffffff',
              color: darkMode ? '#e2e8f0' : '#111827',
            }}
          >
            <div className="modal-icon">✔</div>
            <p>{modal.message}</p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 10,
                marginTop: 12,
              }}
            >
              {modal.type === 'confirm' && (
                <button
                  style={{
                    padding: '8px 14px',
                    background: '#ddd',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                  onClick={modal.onCancel}
                >
                  취소
                </button>
              )}

              <button
                style={{
                  padding: '8px 14px',
                  background: '#4FC3F7',
                  color: 'white',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                onClick={modal.onConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .modal-box {
          background: #ffffff;
          padding: 22px 28px;
          border-radius: 12px;
          border: 2px solid #4fc3f7;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          text-align: center;
          animation: fadeIn 0.25s ease-out;
        }

        .modal-icon {
          color: #4fc3f7;
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 6px;
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

        .datetime-input::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }

        /* 다크 모드에서 아이콘 색 반전 */
        .datetime-input.dark::-webkit-calendar-picker-indicator {
          filter: invert(1);
        }
      `}</style>
    </>
  )
}

/* -------------------- Style -------------------- */

const pageWrap: React.CSSProperties = {
  background: '#F3F6FA',
  minHeight: '100vh',
  padding: 'clamp(12px, 3vw, 24px)',
  paddingTop: 'calc(72px + env(safe-area-inset-top))',
  fontFamily: 'Inter, sans-serif',
  boxSizing: 'border-box',
  overflowX: 'hidden',
}

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 'min(900px, 96vw)', // 🔥 700 → 900
  margin: '0 auto',
  background: '#fff',
  padding: 'clamp(16px, 3vw, 24px)', // 🔥 내부 패딩도 축소
  borderRadius: 18,
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
  border: '1px solid #E3EAF3',
  boxSizing: 'border-box',
}

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(20px, 4vw, 26px)',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  color: '#0277BD',
  marginBottom: 'clamp(10px, 2vw, 16px)', // 🔥 기존보다 줄임
}

const titleIcon: React.CSSProperties = {
  fontSize: 'clamp(22px, 4vw, 28px)',
  marginRight: 6,
}

const label: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: 6,
  marginTop: 'clamp(10px, 2vw, 16px)',
  fontSize: 'clamp(13px, 3vw, 15px)',
  color: '#37474F',
  display: 'block',
}

const inputBox: React.CSSProperties = {
  width: '100%',
  padding: '12px 10px',
  borderRadius: 10,
  border: '1px solid #CFD8DC',
  background: '#F9FAFB',
  fontSize: 'clamp(14px, 3vw, 15px)',
  outline: 'none',
  boxSizing: 'border-box',
}

const textArea: React.CSSProperties = {
  width: '100%',
  padding: '12px 10px',
  borderRadius: 10,
  border: '1px solid #CFD8DC',
  background: '#F9FAFB',
  fontSize: 'clamp(14px, 3vw, 15px)',
  resize: 'none',
  outline: 'none',
  overflow: 'hidden',
  boxSizing: 'border-box',
}

const uploadBtn: React.CSSProperties = {
  marginTop: 16,
  marginBottom: 16,
  width: '100%',
  padding: 'clamp(12px, 3vw, 14px) 0',
  borderRadius: 12,
  background: '#E3F2FD',
  color: '#0277BD',
  fontWeight: 700,
  fontSize: 'clamp(14px, 3vw, 16px)',
  cursor: 'pointer',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxSizing: 'border-box',
}

const uploadBtnIcon: React.CSSProperties = {
  fontSize: 'clamp(20px, 5vw, 22px)',
}

const previewWrap: React.CSSProperties = {
  textAlign: 'center',
  marginTop: 20,
  marginBottom: 20,
}

const previewImg: React.CSSProperties = {
  width: 'min(240px, 100%)',
  borderRadius: 14,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

const deleteBtn: React.CSSProperties = {
  position: 'absolute',
  top: -10,
  right: -10,
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#ffffff',
  border: '1px solid #ccc',
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
}

const submitBtn: React.CSSProperties = {
  width: '100%',
  padding: 'clamp(12px, 3vw, 14px) 0',
  background: 'linear-gradient(90deg, #4FC3F7, #0288D1)',
  border: 'none',
  borderRadius: 12,
  color: 'white',
  fontWeight: 700,
  fontSize: 'clamp(15px, 3vw, 16px)',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(2,136,209,0.25)',
}
