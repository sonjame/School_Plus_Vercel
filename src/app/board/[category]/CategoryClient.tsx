'use client'

import { useParams } from 'next/navigation'
import BoardTemplate from '../BoardTemplate'
import { useEffect, useState } from 'react'

export default function CategoryPage() {
  const params = useParams<{ category: string }>()
  const category = params?.category

  const boardTitleMap: Record<string, string> = {
    free: '자유게시판',
    promo: '홍보게시판',
    club: '동아리게시판',
    grade1: '1학년게시판',
    grade2: '2학년게시판',
    grade3: '3학년게시판',
    graduate: '졸업생게시판',
    admin: '관리자 게시판',
  }

  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('theme_settings')
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      setDarkMode(parsed.darkMode)
    } catch {}
  }, [])

  if (!category || !boardTitleMap[category]) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: darkMode ? '#0f172a' : '#f1f5f9',
          color: darkMode ? '#f1f5f9' : '#111827',
          padding: 40,
          transition: '0.25s',
        }}
      >
        존재하지 않는 게시판입니다.
      </div>
    )
  }

  return <BoardTemplate title={boardTitleMap[category]} category={category} />
}
