import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json([], { status: 401 })
  }

  const userId = session.user.id

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const semester = searchParams.get('semester') // '1학기' | '2학기'

  if (!year || !semester) {
    return NextResponse.json([], { status: 200 })
  }

  const [rows] = await db.query(
    `
    SELECT DISTINCT subject
    FROM timetables
    WHERE user_id = ?
      AND year = ?
      AND semester = ?
    `,
    [userId, year, semester],
  )

  return NextResponse.json(rows)
}
