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
  edu_code: string
  grade: string
  class_num: number
  provider: string
  created_at: string
  is_banned: number
  postCount: number
  commentCount: number
  level: string
}

const EDU_REGION: Record<string, string> = {
  B10: '서울',
  C10: '부산',
  D10: '대구',
  E10: '인천',
  F10: '광주',
  G10: '대전',
  H10: '울산',
  I10: '세종',
  J10: '경기',
  K10: '강원',
  M10: '충북',
  N10: '충남',
  P10: '전북',
  Q10: '전남',
  R10: '경북',
  S10: '경남',
  T10: '제주',
  V10: '재외한국학교',
}
export default function AdminUserListPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('전체')

  const filteredUsers = users.filter((user) => {
    const regionMatch =
      region === '전체' || EDU_REGION[user.edu_code] === region

    const searchMatch =
      user.name.includes(search) || user.school.includes(search)

    return regionMatch && searchMatch
  })

  const middleSchools = (() => {
    const admins = filteredUsers.filter(
      (u) => u.school.includes('중') && u.level === 'admin',
    )

    const normals = filteredUsers
      .filter((u) => u.school.includes('중') && u.level !== 'admin')
      .sort((a, b) => a.school.localeCompare(b.school, 'ko'))

    return [...admins, ...normals]
  })()

  const highSchools = (() => {
    const admins = filteredUsers.filter(
      (u) => u.school.includes('고') && u.level === 'admin',
    )

    const normals = filteredUsers
      .filter((u) => u.school.includes('고') && u.level !== 'admin')
      .sort((a, b) => a.school.localeCompare(b.school, 'ko'))

    return [...admins, ...normals]
  })()

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

      <div style={{ marginBottom: 20 }}>
        {['전체', ...Array.from(new Set(Object.values(EDU_REGION)))].map(
          (r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              style={{
                marginRight: 10,
                marginBottom: 8,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: region === r ? '#2563EB' : '#fff',
                color: region === r ? '#fff' : '#111',
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ),
        )}
      </div>

      <div style={card}>
        <h3 style={{ marginBottom: 10 }}>🏫 중학교</h3>

        {middleSchools.map((user) => (
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

        <h3 style={{ marginTop: 30, marginBottom: 10 }}>🏫 고등학교</h3>

        {highSchools.map((user) => (
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
