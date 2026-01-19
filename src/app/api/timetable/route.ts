import { db } from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

function getUserId(req: Request): number | null {
  const auth = req.headers.get('authorization')
  console.log('AUTH HEADER:', auth)

  if (!auth) return null

  const token = auth.replace('Bearer ', '')
  console.log('TOKEN:', token)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    console.log('DECODED:', decoded)

    return (decoded as any).id ?? null
  } catch (err) {
    console.error('JWT VERIFY ERROR:', err)
    return null
  }
}

/* ================= 시간표 조회 ================= */
export async function GET(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const semester = searchParams.get('semester')

  if (!year || !semester) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  const [rows] = await db.query(
    `
    SELECT day, period, subject, teacher, room
    FROM timetables
    WHERE user_id = ?
      AND year = ?
      AND semester = ?
    ORDER BY day, period
    `,
    [userId, year, semester]
  )

  return NextResponse.json(rows)
}

/* ================= 시간표 저장 ================= */
export async function POST(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { year, semester, classes } = await req.json()

  if (!year || !semester || !Array.isArray(classes)) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  await db.query(
    `DELETE FROM timetables WHERE user_id = ? AND year = ? AND semester = ?`,
    [userId, year, semester]
  )

  for (const c of classes) {
    await db.query(
      `
      INSERT INTO timetables
      (user_id, year, semester, day, period, subject, teacher, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, year, semester, c.day, c.period, c.subject, c.teacher, c.room]
    )
  }

  return NextResponse.json({ ok: true })
}
