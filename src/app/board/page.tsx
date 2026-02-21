'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/src/lib/apiFetch'

interface Post {
  id: string
  title: string
}

interface BoardSection {
  key: string
  title: string
  icon: string
  posts: Post[]
}

type ThemeSettings = {
  darkMode: boolean
}

export default function BoardMainPage() {
  const [sections, setSections] = useState<BoardSection[]>([])

  const [darkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false

    try {
      const raw = localStorage.getItem('theme_settings')
      if (!raw) return false
      const parsed: ThemeSettings = JSON.parse(raw)
      return Boolean(parsed.darkMode)
    } catch {
      return false
    }
  })

  useEffect(() => {
    const boards = [
      { key: 'free', title: '자유게시판', icon: '📝' },
      { key: 'promo', title: '홍보게시판', icon: '📢' },
      { key: 'club', title: '동아리게시판', icon: '🎯' },
      { key: 'grade1', title: '1학년게시판', icon: '1️⃣' },
      { key: 'grade2', title: '2학년게시판', icon: '2️⃣' },
      { key: 'grade3', title: '3학년게시판', icon: '3️⃣' },
      { key: 'graduate', title: '졸업생게시판', icon: '🧭' },
      { key: 'admin', title: '관리자 게시판', icon: '🛠️' },
    ]

    async function load() {
      try {
        const results = await Promise.all(
          boards.map(async (b) => {
            const res = await apiFetch(`/api/posts?category=${b.key}`)
            const posts = res.ok ? await res.json() : []
            return { ...b, posts }
          }),
        )

        setSections(results)
      } catch (e) {
        console.error('게시판 로드 실패', e)
      }
    }

    load()
  }, [])

  return (
    <div style={getOuterStyle(darkMode)}>
      <div style={getInnerStyle(darkMode)}>
        <h1 style={getTitleStyle(darkMode)}>📚 게시판 메인</h1>
        <div style={grid}>
          {sections.map((s) => (
            <Link key={s.key} href={`/board/${s.key}`} style={card}>
              <div style={getCardInnerStyle(darkMode)}>
                <div style={cardIcon}>{s.icon}</div>

                <h3 style={getCardTitle(darkMode)}>{s.title}</h3>

                <p style={getCardDesc(darkMode)}>
                  {s.posts.length > 0
                    ? `${s.posts.length}개의 게시글`
                    : '게시글 없음'}
                </p>

                {s.posts.slice(0, 2).map((p) => (
                  <p key={p.id} style={getMiniPost(darkMode)}>
                    • {p.title}
                  </p>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ===================== Style ===================== */

const getTitleStyle = (darkMode: boolean): React.CSSProperties => ({
  fontSize: '26px',
  fontWeight: 800,
  color: darkMode ? '#f1f5f9' : '#222',
  marginBottom: '26px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
})

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
  gap: '24px',
}

const card: React.CSSProperties = {
  textDecoration: 'none',
  color: 'inherit',
}

const getCardInnerStyle = (darkMode: boolean): React.CSSProperties => ({
  background: darkMode ? '#1e293b' : 'white',
  padding: '24px',
  borderRadius: '16px',
  boxShadow: darkMode
    ? '0 4px 14px rgba(0,0,0,0.35)'
    : '0 4px 14px rgba(0,0,0,0.08)',
  border: darkMode ? '1px solid #334155' : '1px solid #eef1f5',
  transition: '0.25s',
  cursor: 'pointer',
})

;(getCardInnerStyle as any)[':hover'] = {
  transform: 'translateY(-4px)',
  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
}

const cardIcon: React.CSSProperties = {
  fontSize: '32px',
  marginBottom: '10px',
}

const getCardTitle = (darkMode: boolean): React.CSSProperties => ({
  fontSize: '20px',
  fontWeight: 700,
  marginBottom: '6px',
  color: darkMode ? '#f1f5f9' : '#111827',
})

const getCardDesc = (darkMode: boolean): React.CSSProperties => ({
  fontSize: '14px',
  color: darkMode ? '#94a3b8' : '#777',
  marginBottom: '12px',
})

const getMiniPost = (darkMode: boolean): React.CSSProperties => ({
  fontSize: '14px',
  color: darkMode ? '#cbd5e1' : '#4a4a4a',
  background: darkMode ? '#0f172a' : '#f9fbff',
  padding: '6px 10px',
  borderRadius: '6px',
  marginTop: '4px',
})

const getOuterStyle = (darkMode: boolean): React.CSSProperties => ({
  minHeight: '100vh',
  background: darkMode ? '#0f172a' : '#f1f5f9',
})

const getInnerStyle = (darkMode: boolean): React.CSSProperties => ({
  maxWidth: '1200px',

  marginTop: 0,
  marginBottom: 0,
  marginLeft: 'auto',
  marginRight: 'auto',

  padding: '20px',

  paddingTop: 'clamp(60px, 10vw, 80px)',

  background: darkMode ? '#0f172a' : 'white',
  color: darkMode ? '#f1f5f9' : '#111827',
})
