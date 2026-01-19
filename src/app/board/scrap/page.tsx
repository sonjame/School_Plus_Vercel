'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function ScrapPage() {
  const [scraps, setScraps] = useState<any[]>([])

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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
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
          <div style={card}>
            <div style={header}>
              <span style={tag}>{categoryToName(p.category)}</span>
              <span style={likes}>💙 {p.likes}</span>
            </div>

            <h3 style={title}>{p.title}</h3>
            <p style={content}>{p.content}</p>

            <div style={footer}>
              <span>{p.author}</span>
              <span>{new Date(p.created_at).toLocaleString()}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ---------- STYLE (동일) ---------- */
const card: React.CSSProperties = {
  background: '#ffffff',
  padding: '18px 22px',
  borderRadius: 14,
  border: '1px solid #E1F5FE',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  marginBottom: 16,
  transition: '0.2s',
}

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

const title: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  margin: '6px 0',
  color: '#333',
}

const content: React.CSSProperties = {
  fontSize: 14,
  color: '#666',
  marginBottom: 12,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}

const footer: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 12,
  color: '#888',
}

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
