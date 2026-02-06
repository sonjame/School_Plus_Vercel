import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: commentId } = await context.params

    /* 🔐 관리자 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    if (decoded.level !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    const { hidden } = await req.json()

    await db.query(
      `
      UPDATE post_comments   -- ✅ 여기 핵심
      SET is_hidden = ?
      WHERE id = ?
      `,
      [hidden ? 1 : 0, commentId],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ admin comment hidden error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
