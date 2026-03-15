'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '@/src/lib/apiFetch'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  username: string
  name: string
  email: string
  school: string
  grade: string
  class_num: number
  provider: string
  created_at: string
  is_banned: number
  banned_reason?: string
  banned_until?: string
}

interface Post {
  id: string
  title: string
  content: string
  category: string
  created_at: string
  likes: number
  is_hidden: number
}

interface Comment {
  id: string
  post_id: string
  content: string
  created_at: string
  likes: number
  is_hidden: number
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  function cleanContent(html: string) {
    return (
      html
        // 빈 style 제거
        .replace(/\sstyle=""/g, '')

        // 완전 빈 p 제거
        .replace(/<p>\s*<\/p>/g, '')
        .replace(/<p>(?:&nbsp;|\s)*<\/p>/g, '')

        // 모든 HTML 태그 제거 (🔥 핵심)
        .replace(/<[^>]+>/g, '')
    )
  }

  function getBanType(bannedUntil?: string) {
    if (!bannedUntil) return '영구 정지'

    const now = new Date().getTime()
    const until = new Date(bannedUntil).getTime()

    const diffHours = Math.round((until - now) / (1000 * 60 * 60))

    if (diffHours <= 24) return '24시간 정지'
    if (diffHours <= 72) return '72시간 정지'
    if (diffHours <= 168) return '7일 정지'

    return '장기 정지'
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/admin/userinfo/${userId}`)

        if (!res.ok) {
          console.error('API 오류:', res.status)
          setLoading(false)
          return
        }

        const data = await res.json()

        setUser(data.user)
        setPosts(data.posts || [])
        setComments(data.comments || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (userId) load()
  }, [userId])

  if (loading) return <p style={{ padding: 40 }}>불러오는 중...</p>
  if (!user) return <p style={{ padding: 40 }}>유저 없음</p>

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: 20 }}>
      <button
        onClick={() => router.push('/admin/userinfo')}
        style={{
          marginBottom: 16,
          padding: '8px 14px',
          borderRadius: 8,
          border: 'none',
          background: '#E5E7EB',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        ← 사용자 목록으로
      </button>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        👤 {user.username} 상세 정보
      </h1>

      {/* ================= 유저 정보 ================= */}
      <div style={card}>
        <h2 style={sectionTitle}>기본 정보</h2>
        <p>
          <strong>이름:</strong> {user.name}
        </p>
        <p>
          <strong>이메일:</strong> {user.email}
        </p>
        <p>
          <strong>학교:</strong> {user.school}
        </p>
        <p>
          <strong>학년/반:</strong> {user.grade} / {user.class_num}
        </p>
        <p>
          <strong>가입일:</strong> {new Date(user.created_at).toLocaleString()}
        </p>
        <p>
          <strong>정지 상태:</strong>{' '}
          {user.is_banned ? `🚫 ${getBanType(user.banned_until)}` : '정상'}
        </p>

        {user.is_banned && (
          <>
            <p>
              <strong>정지 사유:</strong> {user.banned_reason || '없음'}
            </p>

            <p>
              <strong>정지 해제:</strong>{' '}
              {user.banned_until
                ? new Date(user.banned_until).toLocaleString()
                : '영구 정지'}
            </p>
          </>
        )}
      </div>

      {/* ================= 게시글 ================= */}
      <div style={card}>
        <h2 style={sectionTitle}>작성 게시글 ({posts.length})</h2>

        {posts.length === 0 && <p>작성한 게시글이 없습니다.</p>}

        {posts.map((post) => (
          <div key={post.id} style={listItem}>
            <div style={{ flex: 1 }}>
              <strong>{post.title}</strong>

              <div style={subText}>
                {post.category} · {new Date(post.created_at).toLocaleString()}
              </div>

              {/* 🔥 게시글 내용 추가 */}
              <div style={{ marginTop: 6, fontSize: 13 }}>
                {post.is_hidden
                  ? '🚫 블라인드된 게시글입니다.'
                  : cleanContent(post.content)}
              </div>
            </div>

            <div style={rightInfo}>👍 {post.likes}</div>
          </div>
        ))}
      </div>

      {/* ================= 댓글 ================= */}
      <div style={card}>
        <h2 style={sectionTitle}>작성 댓글 ({comments.length})</h2>

        {comments.length === 0 && <p>작성한 댓글이 없습니다.</p>}

        {comments.map((comment) => (
          <div key={comment.id} style={listItem}>
            <div>
              {cleanContent(comment.content)}
              <div style={subText}>
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>

            <div style={rightInfo}>
              👍 {comment.likes}
              {comment.is_hidden ? ' (숨김)' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================= 스타일 ================= */

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  marginBottom: 16,
}

const listItem: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '10px 0',
  borderBottom: '1px solid #E5E7EB',
}

const subText: React.CSSProperties = {
  fontSize: 12,
  color: '#6B7280',
}

const rightInfo: React.CSSProperties = {
  fontSize: 13,
  color: '#374151',
}
