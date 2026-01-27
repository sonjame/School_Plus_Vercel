import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

async function getUserId(
  req: Request,
): Promise<{ userId: number; newAccessToken?: string } | null> {
  const auth = req.headers.get('authorization')
  if (!auth) return null

  const accessToken = auth.replace('Bearer ', '')

  try {
    const decoded: any = jwt.verify(accessToken, process.env.JWT_SECRET!)
    return { userId: decoded.id }
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      // 🔥 refresh 시도
      const refreshRes = await fetch(new URL('/api/auth/refresh', req.url), {
        method: 'POST',
        headers: {
          cookie: req.headers.get('cookie') ?? '',
        },
      })

      if (!refreshRes.ok) return null

      const data = await refreshRes.json()
      const newAccessToken =
        refreshRes.headers.get('x-access-token') ?? data.accessToken

      if (!newAccessToken) return null

      const decoded: any = jwt.verify(newAccessToken, process.env.JWT_SECRET!)

      return { userId: decoded.id, newAccessToken }
    }

    return null
  }
}

/* ================= 시간표 조회 ================= */
export async function GET(req: Request) {
  const authResult = await getUserId(req)
  if (!authResult) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { userId, newAccessToken } = authResult

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
    [userId, year, semester],
  )

  const res = NextResponse.json(rows)

  if (newAccessToken) {
    res.headers.set('x-access-token', newAccessToken)
  }

  return res
}

/* ================= 시간표 저장 ================= */
export async function POST(req: Request) {
  const authResult = await getUserId(req)
  if (!authResult) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { userId, newAccessToken } = authResult

  const { year, semester, classes } = await req.json()

  if (!year || !semester || !Array.isArray(classes)) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  await db.query(
    `DELETE FROM timetables WHERE user_id = ? AND year = ? AND semester = ?`,
    [userId, year, semester],
  )

  for (const c of classes) {
    await db.query(
      `
      INSERT INTO timetables
      (user_id, year, semester, day, period, subject, teacher, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, year, semester, c.day, c.period, c.subject, c.teacher, c.room],
    )
  }

  const res = NextResponse.json({ ok: true })

  if (newAccessToken) {
    res.headers.set('x-access-token', newAccessToken)
  }

  return res
}
