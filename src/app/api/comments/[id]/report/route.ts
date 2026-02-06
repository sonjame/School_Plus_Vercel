import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // ⭐ 반드시 await
    const { id: commentId } = await context.params

    /* 🔐 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.id
    const { type, content } = await req.json()

    if (!type) {
      return NextResponse.json({ message: '신고 유형 누락' }, { status: 400 })
    }

    /* ❌ 중복 신고 방지 */
    const [[exists]]: any = await db.query(
      `
      SELECT id FROM comment_reports
      WHERE comment_id = ? AND user_id = ?
      `,
      [commentId, userId],
    )

    if (exists) {
      return NextResponse.json({ message: 'already reported' }, { status: 409 })
    }

    /* ✅ 신고 저장 */
    await db.query(
      `
      INSERT INTO comment_reports (
        comment_id,
        user_id,
        type,
        content
      ) VALUES (?, ?, ?, ?)
      `,
      [commentId, userId, type, content ?? null],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ comment report error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
