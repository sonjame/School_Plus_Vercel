'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ScrapPage() {
  const [scraps, setScraps] = useState<any[]>([])

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

  useEffect(() => {
    async function loadScraps() {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setScraps([])
        return
      }

      const res = await fetch(`/api/posts/scrap?userId=${userId}`)

      // ✅ 1. HTTP 에러 방어
      if (!res.ok) {
        console.error('❌ scrap fetch failed:', res.status)
        setScraps([])
        return
      }

      // ✅ 2. 빈 응답 방어
      const text = await res.text()
      if (!text) {
        console.warn('⚠️ scrap API returned empty body')
        setScraps([])
        return
      }

      // ✅ 3. JSON 파싱
      let data
      try {
        data = JSON.parse(text)
      } catch (e) {
        console.error('❌ JSON parse error:', e)
        setScraps([])
        return
      }

      // ✅ 4. 타입 방어
      if (Array.isArray(data)) {
        setScraps(data)
      } else {
        console.error('❌ scraps API returned non-array:', data)
        setScraps([])
      }
    }

    loadScraps()
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: darkMode ? '#0f172a' : '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 20,
          color: darkMode ? '#f1f5f9' : '#111827',
        }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#4FC3F7',
            marginBottom: 20,
          }}
        >
          ⭐ 스크랩한 글
        </h2>

        {scraps.length === 0 && (
          <p style={{ color: '#777', fontSize: 15 }}>
            스크랩한 게시글이 없습니다.
          </p>
        )}

        {scraps.map((p) => (
          <Link
            key={p.id}
            href={`/board/post/${p.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={getCardStyle(darkMode)}>
              <div style={header}>
                <span style={tag}>{categoryToName(p.category)}</span>
                <span style={likes}>💙 {p.likes}</span>
              </div>
              <h3 style={getTitleStyle(darkMode)}>{p.title}</h3>
              <p style={getContentStyle(darkMode)}>{p.content}</p>

              <div style={getFooterStyle(darkMode)}>
                <span>{p.author}</span>
                <span>{new Date(p.created_at).toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ---------- STYLE (동일) ---------- */
const getCardStyle = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : '#ffffff',
  padding: '18px 22px',
  borderRadius: 14,
  border: darkMode ? '1px solid #334155' : '1px solid #E1F5FE',
  boxShadow: darkMode
    ? '0 4px 14px rgba(0,0,0,0.35)'
    : '0 2px 8px rgba(0,0,0,0.06)',
  marginBottom: 16,
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

const likes: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#555',
}

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

function categoryToName(c?: string) {
  if (!c) return '자유' // 🔥 방어 (undefined / null)

  if (c === 'free') return '자유'
  if (c === 'promo') return '홍보'
  if (c === 'club') return '동아리'

  if (c.startsWith('grade')) {
    return `${c.replace('grade', '')}학년`
  }

  return '자유' // 🔥 알 수 없는 값 방어
}
