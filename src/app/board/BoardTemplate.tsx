'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'
import { useRouter } from 'next/navigation'

interface Post {
  id: string
  title: string
  content: string
  author: string
  likes: number
  created_at: string
  commentCount: number
  images?: string[] // 🔥 추가
  image?: string // 🔥 단일 이미지 대비
  thumbnail?: string
  attachments?: {
    type: 'link' | 'video'
    url: string
    thumbnail?: string
  }[]
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, '')
}

export default function BoardTemplate({
  title,
  category,
}: {
  title: string
  category: string
}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortType, setSortType] = useState<'latest' | 'likes'>('latest')

  // 🔒 학년 상태
  const [myGrade, setMyGrade] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const grade = localStorage.getItem('userGrade')
    setMyGrade(grade)
  }, [])

  // 🔒 작성 권한 체크
  const canWrite =
    category === 'admin' ||
    ['free', 'promo', 'club'].includes(category) ||
    category === myGrade

  const getCommentCount = (id: string) => {
    const data = JSON.parse(localStorage.getItem(`comments_${id}`) || '[]')
    return data.length
  }

  const getYoutubeThumbnail = (url: string) => {
    const regExp =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&?/]+)/

    const match = url.match(regExp)
    const videoId = match ? match[1] : null

    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null
  }

  const parseDate = (value: string) => {
    if (!value) return new Date(0)

    // 이미 ISO 형식이면 그대로
    if (value.includes('T')) {
      return new Date(value)
    }

    // MySQL 형식 (YYYY-MM-DD HH:mm:ss)
    return new Date(value.replace(' ', 'T'))
  }

  const router = useRouter()

  const [banInfo, setBanInfo] = useState<{
    reason: string
    remainHours?: number
  } | null>(null)

  const checkBanAndAlert = async (): Promise<boolean> => {
    const token = localStorage.getItem('accessToken')
    if (!token) return false

    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.status === 403) {
      const data = await res.json()

      setBanInfo({
        reason: data.reason,
        remainHours: data.remainHours,
      })

      return true // 🚫 정지 상태
    }

    return false // ✅ 정상
  }

  const isVideo = (url: string) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url)
  }

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
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

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreen() // 처음 실행
    window.addEventListener('resize', checkScreen)

    return () => window.removeEventListener('resize', checkScreen)
  }, [])

  useEffect(() => {
    router.prefetch(`/board/write?category=${category}`)
  }, [category])

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/posts?category=${category}`)
        if (!res.ok) return

        const data = await res.json()
        setPosts(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('게시글 로드 실패', e)
      }
    }

    load()
  }, [category])

  /* ------------------ 🔍 검색 기능 수정 ------------------ */
  const filteredPosts = posts.filter((p) => {
    const term = searchTerm.toLowerCase()

    const authorName = p.author

    return (
      p.title.toLowerCase().includes(term) ||
      p.content.toLowerCase().includes(term) ||
      authorName.toLowerCase().includes(term)
    )
  })

  /* ------------------ 📌 정렬 ------------------ */
  const sorted = [...filteredPosts].sort((a, b) => {
    if (sortType === 'latest') {
      return (
        parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime()
      )
    }

    if (sortType === 'likes') return b.likes - a.likes
    return 0
  })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: darkMode ? '#0f172a' : '#f1f5f9',
      }}
    >
      {/* 🚫 계정 정지 모달 */}
      {banInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '420px',
              background: darkMode ? '#1e293b' : '#fff',
              color: darkMode ? '#f1f5f9' : '#111827',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ color: '#d32f2f', marginBottom: '12px' }}>
              🚫 계정 이용 제한
            </h2>

            <p
              style={{
                fontSize: '15px',
                color: darkMode ? '#cbd5e1' : '#444',
                marginBottom: '12px',
              }}
            >
              {banInfo.reason}
            </p>

            {banInfo.remainHours !== undefined && (
              <p
                style={{
                  fontSize: '14px',
                  color: darkMode ? '#94a3b8' : '#666',
                }}
              >
                남은 정지 시간: <strong>{banInfo.remainHours}시간</strong>
              </p>
            )}

            <p
              style={{
                fontSize: '14px',
                color: darkMode ? '#cbd5e1' : '#555',
                marginTop: '10px',
              }}
            >
              현재 계정은 <strong>게시글·댓글 작성이 제한</strong>되어 있습니다.
            </p>

            <button
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#4FC3F7',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setBanInfo(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          background: darkMode ? '#1e293b' : '#fff',
          color: darkMode ? '#f1f5f9' : '#111827',
          padding: 'clamp(14px, 2vw, 20px) clamp(10px, 2vw, 16px)',
          paddingTop: isMobile ? '65px' : '40px',
          borderRadius: '12px',
          maxWidth: 'min(1200px, 98vw)',
          margin: '0 auto',
          marginTop: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 18,
          }}
        >
          {/* 🔙 뒤로가기 버튼 */}
          <Link
            href="/board"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#E3F2FD',
              color: '#0288D1',
              textDecoration: 'none',
              fontSize: 20,
              fontWeight: 700,
              flexShrink: 0,
            }}
            aria-label="게시판 메인으로"
          >
            ←
          </Link>

          {/* 제목 */}
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              borderBottom: '2px solid #4FC3F7',
              paddingBottom: '6px',
              margin: 0,
              color: '#4FC3F7',
              flex: 1,
            }}
          >
            {title}
          </h2>
        </div>

        {/* 검색 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* 왼쪽 영역 */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              flex: 1, // ⭐ 이게 핵심
            }}
          >
            <input
              placeholder="검색어를 입력하세요"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0 12px',
                height: 44,
                borderRadius: 8,
                border: darkMode ? '1.5px solid #334155' : '1.5px solid #ccc',
                background: darkMode ? '#0f172a' : '#fff',
                color: darkMode ? '#f1f5f9' : '#111827',
                flex: 1, // ⭐ input도 늘어나게
                minWidth: 180,
              }}
            />

            <select
              value={sortType}
              onChange={(e) =>
                setSortType(e.target.value as 'latest' | 'likes')
              }
              style={{
                padding: '0 12px',
                height: 44,
                borderRadius: 8,
                border: darkMode ? '1.5px solid #334155' : '1.5px solid #ccc',
                background: darkMode ? '#0f172a' : '#fff',
                color: darkMode ? '#f1f5f9' : '#111827',
              }}
            >
              <option value="latest">🕒 최신순</option>
              <option value="likes">💙 좋아요순</option>
            </select>
          </div>

          {/* 오른쪽 버튼 */}
          {canWrite ? (
            <button
              onClick={async () => {
                const banned = await checkBanAndAlert()
                if (banned) return
                router.replace(`/board/write?category=${category}`)
              }}
              style={{
                height: 44,
                padding: '0 18px',
                background: '#4FC3F7',
                color: 'white',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              ✏ 글쓰기
            </button>
          ) : (
            <div
              style={{
                height: 44,
                padding: '0 18px',
                background: '#ECEFF1',
                color: '#78909C',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'not-allowed',
                marginLeft: 'auto',
              }}
            >
              {category === 'admin'
                ? '🔒 로그인한 사용자만 작성할 수 있습니다'
                : '🔒 해당 학년만 작성 가능'}
            </div>
          )}
        </div>

        {/* 목록 */}
        {sorted.length === 0 ? (
          <p
            style={{
              color: darkMode ? '#94a3b8' : '#666',
              textAlign: 'center',
            }}
          >
            게시글이 없습니다.
          </p>
        ) : (
          sorted.map((p) => {
            const authorName = p.author
            let thumbnail: string | null = null

            // 0️⃣ 대표 썸네일 최우선
            if (p.thumbnail) {
              thumbnail = p.thumbnail
            }

            // 1️⃣ 이미지 우선
            if (!thumbnail && p.images && p.images.length > 0) {
              thumbnail = p.images[0]
            } else if (!thumbnail && p.image) {
              thumbnail = p.image
            }

            // 2️⃣ 이미지 없으면 attachments 확인

            if (!thumbnail && p.attachments) {
              // 1️⃣ link 중 대표 썸네일 먼저 찾기
              const linkAttachment = p.attachments.find(
                (a) => a.type === 'link' && a.thumbnail,
              )

              if (linkAttachment?.thumbnail) {
                thumbnail = linkAttachment.thumbnail
              }

              // 2️⃣ 그 다음 video 처리
              if (!thumbnail) {
                const videoAttachment = p.attachments.find(
                  (a) => a.type === 'video',
                )

                if (videoAttachment) {
                  const url = videoAttachment.url

                  if (url.includes('youtube') || url.includes('youtu.be')) {
                    thumbnail = getYoutubeThumbnail(url)
                  } else if (videoAttachment.thumbnail) {
                    thumbnail = videoAttachment.thumbnail
                  } else if (isVideo(url)) {
                    thumbnail = url
                  }
                }
              }
            }
            return (
              <Link
                key={p.id}
                href={`/board/post/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: darkMode
                      ? '1px solid #334155'
                      : '2px solid #E1F5FE',
                    background: darkMode ? '#0f172a' : '#fff',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column', // ⭐ 핵심
                    gap: 8,
                  }}
                >
                  {/* 🔥 제목 */}
                  <h3
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: darkMode ? '#f1f5f9' : '#111827',
                      margin: 0,
                    }}
                  >
                    {p.title}
                  </h3>

                  {/* 🔥 썸네일 (제목 아래) */}
                  {thumbnail &&
                    (isVideo(thumbnail) ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: 12,
                          overflow: 'hidden',
                          background: '#000',
                        }}
                      >
                        <video
                          src={thumbnail}
                          muted
                          preload="metadata"
                          playsInline
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 42,
                            color: 'white',
                          }}
                        >
                          ▶
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          maxWidth: isMobile ? '100%' : '250px', // 🔥 핵심
                          margin: isMobile ? '0' : '0 auto 0 0', // 🔥 PC에서는 가운데 정렬
                          aspectRatio: '16 / 9',
                          borderRadius: 12,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={thumbnail}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />

                        {/* 유튜브 오버레이 */}
                        {thumbnail.includes('img.youtube.com') && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 42,
                              color: 'white',
                              textShadow: '0 4px 12px rgba(0,0,0,0.6)',
                            }}
                          >
                            ▶
                          </div>
                        )}
                      </div>
                    ))}
                  {/* 🔥 내용 */}
                  <p
                    style={{
                      marginTop: 4,
                      color: darkMode ? '#94a3b8' : '#666',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {stripHtml(p.content)}
                  </p>

                  {/* 🔥 하단 정보 */}
                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      color: '#666',
                    }}
                  >
                    <span>
                      작성자: {authorName} ·{' '}
                      {parseDate(p.created_at).toLocaleString()}
                    </span>

                    <span style={{ display: 'flex', gap: 10 }}>
                      <span>💙 {p.likes}</span>
                      <span>💬 {p.commentCount}</span>
                    </span>
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
