import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const semester = searchParams.get('semester')
  const school = searchParams.get('school')

  if (!year || !semester || !school) {
    return NextResponse.json(
      { message: 'year/semester/school required' },
      { status: 400 }
    )
  }
  const [rows]: any = await db.query(
    `SELECT
     id,
     rating,
     reason,
     created_at AS createdAt,
     teacher,
     user_id AS userId,
     subject
   FROM subject_reviews
   WHERE year = ? AND semester = ? AND school = ?`,
    [year, semester, school]
  )

  const grouped: Record<string, any[]> = {}
  for (const r of rows) {
    const key = `${r.subject}|${r.teacher}`
    grouped[key] ??= []
    grouped[key].push(r)
  }

  return NextResponse.json(grouped)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { year, semester, subject, teacher, rating, reason, school } = body
  if (!school) {
    return NextResponse.json({ message: 'school required' }, { status: 400 })
  }

  if (!year || !semester || !subject || !teacher || !rating) {
    return NextResponse.json({ message: 'missing fields' }, { status: 400 })
  }

  // 🔐 서버 기준
  const userId = body.userId ?? 0 // 로그인 연동 전까지 임시

  await db.query(
    `INSERT INTO subject_reviews
   (year, semester, subject, teacher, rating, reason, created_at, user_id, school)
   VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
    [year, semester, subject, teacher, rating, reason ?? '', userId, school]
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const body = await req.json()
  const { id, userId } = body

  // 🔐 로그인 체크
  if (typeof userId !== 'number' || userId <= 0) {
    return NextResponse.json({ message: 'login required' }, { status: 401 })
  }

  const [result]: any = await db.query(
    `DELETE FROM subject_reviews
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  )

  // 🔒 본인 글 아니면 삭제 안 됨
  if (result.affectedRows === 0) {
    return NextResponse.json({ message: 'not allowed' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}
