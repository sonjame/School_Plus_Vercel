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
  commentCount: number // ✅ 추가
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

  // 🔒 학년별 작성 권한 체크
  const myGrade =
    typeof window !== 'undefined' ? localStorage.getItem('userGrade') : null

  const canWrite =
    category === 'admin' || // 🔥 관리자 게시판은 누구나 작성 가능
    ['free', 'promo', 'club'].includes(category) ||
    category === myGrade

  const getCommentCount = (id: string) => {
    const data = JSON.parse(localStorage.getItem(`comments_${id}`) || '[]')
    return data.length
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
    <>
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
              background: '#fff',
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
              style={{ fontSize: '15px', color: '#444', marginBottom: '12px' }}
            >
              {banInfo.reason}
            </p>

            {banInfo.remainHours !== undefined && (
              <p style={{ fontSize: '14px', color: '#666' }}>
                남은 정지 시간: <strong>{banInfo.remainHours}시간</strong>
              </p>
            )}

            <p style={{ fontSize: '14px', color: '#555', marginTop: '10px' }}>
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
          background: '#fff',
          padding: 'clamp(14px, 2vw, 20px) clamp(10px, 2vw, 16px)',
          borderRadius: '12px',
          maxWidth: 'min(1200px, 98vw)',
          margin: '0 auto',
          marginTop: 'clamp(12px, 4vw, 28px)',
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
            gap: 12,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <input
            placeholder="검색어를 입력하세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1 1 200px',
              padding: 12,
              borderRadius: 8,
              border: '1.5px solid #ccc',
            }}
          />
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as 'latest' | 'likes')}
            style={{
              padding: '0 12px',
              height: 44,
              borderRadius: 8,
              border: '1.5px solid #ccc',
            }}
          >
            <option value="latest">🕒 최신순</option>
            <option value="likes">💙 좋아요순</option>
          </select>

          {canWrite ? (
            <button
              onClick={async () => {
                const banned = await checkBanAndAlert()
                if (banned) return

                router.push(`/board/write?category=${category}`)
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
          <p style={{ color: '#666', textAlign: 'center' }}>
            게시글이 없습니다.
          </p>
        ) : (
          sorted.map((p) => {
            const authorName = p.author

            return (
              <Link
                key={p.id}
                href={`/board/post/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    border: '2px solid #E1F5FE',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 14,
                    cursor: 'pointer',
                  }}
                >
                  <h3 style={{ fontSize: 20, fontWeight: 600 }}>{p.title}</h3>

                  <p
                    style={{
                      marginTop: 6,
                      color: '#555',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.content}
                  </p>

                  <div
                    style={{
                      marginTop: 10,
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
    </>
  )
}
