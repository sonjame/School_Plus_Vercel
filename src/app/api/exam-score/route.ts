import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

function getUserId(req: Request): number | null {
  const auth = req.headers.get('authorization')
  if (!auth) return null

  const token = auth.replace('Bearer ', '')
  if (!process.env.JWT_SECRET) return null

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      id: number
    }
    return decoded.id
  } catch {
    return null
  }
}

/* ================= 점수 저장 ================= */
export async function POST(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { year, semester, exam, scores } = await req.json()

  if (!year || !semester || !exam || typeof scores !== 'object') {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  for (const subject of Object.keys(scores)) {
    const score = Number(scores[subject])

    if (!Number.isFinite(score) || score < 0 || score > 100) continue

    await db.query(
      `
    INSERT INTO exam_scores
    (user_id, year, semester, exam, subject, score)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      score = VALUES(score),
      updated_at = CURRENT_TIMESTAMP
    `,
      [userId, year, semester, exam, subject, score ?? null],
    )
  }

  return NextResponse.json({ ok: true })
}

/* ================= 점수 조회 ================= */
export async function GET(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  // ✅ 여기 핵심
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))

  if (!year) {
    return NextResponse.json({ message: 'year 필요' }, { status: 400 })
  }

  const [rows]: any = await db.query(
    `
    SELECT exam, subject, score
    FROM exam_scores
    WHERE user_id = ? AND year = ?
    `,
    [userId, year],
  )

  return NextResponse.json(rows)
}

export async function PUT(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { year, exam, oldSubject, newSubject } = await req.json()

  if (!year || !exam || !oldSubject || !newSubject) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  await db.query(
    `
    UPDATE exam_scores
    SET subject = ?
    WHERE user_id = ? AND year = ? AND exam = ? AND subject = ?
    `,
    [newSubject, userId, year, exam, oldSubject],
  )

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const userId = getUserId(req)
  if (!userId) {
    return NextResponse.json({ message: '인증 필요' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const exam = searchParams.get('exam')
  const subject = searchParams.get('subject')

  if (!year || !exam || !subject) {
    return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
  }

  await db.query(
    `
    DELETE FROM exam_scores
    WHERE user_id = ? AND year = ? AND exam = ? AND subject = ?
    `,
    [userId, year, exam, subject],
  )

  return NextResponse.json({ ok: true })
}
