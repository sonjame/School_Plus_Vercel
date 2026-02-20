'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/src/lib/apiFetch'

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
  postCount: number
  commentCount: number
  level: string
}

export default function AdminUserListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const filteredUsers = users.filter(
    (user) => user.name.includes(search) || user.school.includes(search),
  )

  useEffect(() => {
    async function load() {
      const res = await apiFetch('/api/admin/userinfo')
      const data = await res.json()
      const sorted = (data || []).sort((a: User, b: User) => {
        // 1️⃣ 관리자 먼저
        if (a.level === 'admin' && b.level !== 'admin') return -1
        if (a.level !== 'admin' && b.level === 'admin') return 1

        // 2️⃣ 둘 다 관리자면 이름순 정렬
        if (a.level === 'admin' && b.level === 'admin') {
          return a.name.localeCompare(b.name, 'ko')
        }

        // 3️⃣ 일반 유저는 학교 기준 한글 정렬
        return a.school.localeCompare(b.school, 'ko')
      })

      setUsers(sorted)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p style={{ padding: 40 }}>불러오는 중...</p>

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>
        👥 전체 사용자 정보
      </h1>

      <input
        type="text"
        placeholder="이름 또는 학교 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '97.5%',
          padding: '10px 14px',
          marginBottom: 20,
          borderRadius: 8,
          border: '1px solid #E5E7EB',
        }}
      />

      <div style={card}>
        {filteredUsers.map((user) => (
          <Link key={user.id} href={`/admin/userinfo/${user.id}`} style={row}>
            <div>
              <strong>{user.username}</strong> ({user.name})
              <div style={subText}>
                {user.school} · {user.grade}/{user.class_num}
              </div>
              <div style={subText}>
                게시글 {user.postCount}개 · 댓글 {user.commentCount}개
              </div>
            </div>

            <div>
              {user.level === 'admin' && (
                <span style={{ color: '#2563EB', fontWeight: 700 }}>
                  🛡 관리자
                </span>
              )}

              {user.level !== 'admin' && (
                <span style={{ color: user.is_banned ? 'red' : '#16A34A' }}>
                  {user.is_banned ? '🚫 정지' : '정상'}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
}

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '14px 0',
  borderBottom: '1px solid #E5E7EB',
  textDecoration: 'none',
  color: '#111827',
}

const subText: React.CSSProperties = {
  fontSize: 12,
  color: '#6B7280',
}
