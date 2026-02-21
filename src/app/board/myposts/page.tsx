'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/src/lib/apiFetch'

type ThemeSettings = {
  darkMode: boolean
}

export default function MyPostsPage() {
  const [myPosts, setMyPosts] = useState<any[]>([])

  const [darkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false

    const raw = localStorage.getItem('theme_settings')
    if (!raw) return false

    try {
      const parsed: ThemeSettings = JSON.parse(raw)
      return Boolean(parsed.darkMode)
    } catch {
      return false
    }
  })

  useEffect(() => {
    async function loadMine() {
      const userId = localStorage.getItem('userId')
      if (!userId) return

      const res = await apiFetch(`/api/posts/mine?userId=${userId}`)
      if (!res.ok) {
        setMyPosts([])
        return
      }

      const data = await res.json()

      if (Array.isArray(data)) {
        setMyPosts(data)
      } else if (Array.isArray(data.posts)) {
        setMyPosts(data.posts)
      } else {
        setMyPosts([])
      }
    }

    loadMine()
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: darkMode ? '#0f172a' : '#f8fafc',
        transition: 'all 0.25s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: 20,
          minHeight: '100vh',
          background: darkMode ? '#0f172a' : '#f8fafc',
          color: darkMode ? '#f1f5f9' : '#111827',
          transition: 'all 0.25s ease',
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#4FC3F7',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          📝 내가 쓴 글
        </h2>

        {myPosts.length === 0 && (
          <p
            style={{
              color: darkMode ? '#94a3b8' : '#777',
              fontSize: 15,
            }}
          >
            작성한 게시글이 없습니다.
          </p>
        )}

        {myPosts.map((p) => (
          <Link
            key={p.id}
            href={`/board/post/${p.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={getCardStyle(darkMode)}>
              <div style={header}>
                <span style={tag}>{categoryToName(p.category)}</span>
                <span style={getLikesStyle(darkMode)}>💙 {p.likes}</span>
              </div>

              <h3 style={getTitleStyle(darkMode)}>{p.title}</h3>
              <p style={getContentStyle(darkMode)}>{p.content}</p>

              <div style={getFooterStyle(darkMode)}>
                <span>{p.author}</span>
                <span>{new Date(p.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ---------- STYLE ---------- */

const getCardStyle = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : '#ffffff',
  padding: '18px 22px',
  borderRadius: 14,
  border: darkMode ? '1px solid #334155' : '1px solid #E1F5FE',
  boxShadow: darkMode
    ? '0 4px 14px rgba(0,0,0,0.35)'
    : '0 2px 8px rgba(0,0,0,0.06)',
  marginBottom: 16,
  transition: '0.25s',
})

const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
}

const tag: React.CSSProperties = {
  padding: '4px 10px',
  background: '#4FC3F7',
  color: 'white',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
}

const getLikesStyle = (darkMode: boolean): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 600,
  color: darkMode ? '#cbd5e1' : '#555',
})
const getTitleStyle = (darkMode: boolean): React.CSSProperties => ({
  fontSize: 18,
  fontWeight: 700,
  margin: '6px 0',
  color: darkMode ? '#f1f5f9' : '#333',
})

const getContentStyle = (darkMode: boolean): React.CSSProperties => ({
  fontSize: 14,
  color: darkMode ? '#cbd5e1' : '#666',
  marginBottom: 12,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
})

const getFooterStyle = (darkMode: boolean): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  color: darkMode ? '#94a3b8' : '#888',
})

function categoryToName(c: string) {
  return c === 'free'
    ? '자유'
    : c === 'promo'
      ? '홍보'
      : c === 'club'
        ? '동아리'
        : `${c.replace('grade', '')}학년`
}
