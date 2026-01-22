import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import db from '@/src/lib/db'

function getUserId(req: Request): number | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null

  try {
    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded.id
  } catch {
    return null
  }
}

/* 🔍 검색 기록 저장 */
export async function POST(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { keyword } = await req.json()
  if (!keyword || typeof keyword !== 'string') {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  // 🔥 같은 검색어 있으면 시간만 갱신
  await db.query(
    `
    INSERT INTO search_history (user_id, keyword)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
    `,
    [userId, keyword],
  )

  return NextResponse.json({ ok: true })
}

/* 🕘 최근 검색어 / 🔍 연관 검색어 */
export async function GET(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  // 🔍 연관 검색어 (자동완성)
  if (q) {
    const [rows] = await db.query(
      `
      SELECT id, keyword
      FROM search_history
      WHERE user_id = ?
        AND keyword LIKE ?
      ORDER BY created_at DESC
      LIMIT 8
      `,
      [userId, `%${q}%`],
    )

    return NextResponse.json(rows)
  }

  // 🕘 최근 검색어
  const [rows] = await db.query(
    `
    SELECT id, keyword, created_at
    FROM search_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 10
    `,
    [userId],
  )

  return NextResponse.json(rows)
}

/* ❌ 검색어 삭제 */
/* ❌ 검색어 삭제 (단일 / 전체) */
export async function DELETE(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  let body = null
  try {
    body = await req.json()
  } catch {}

  // ✅ 전체 삭제
  if (!body?.id) {
    await db.query(`DELETE FROM search_history WHERE user_id = ?`, [userId])
    return NextResponse.json({ ok: true })
  }

  // ✅ 단일 삭제
  await db.query(`DELETE FROM search_history WHERE id = ? AND user_id = ?`, [
    body.id,
    userId,
  ])

  return NextResponse.json({ ok: true })
}
