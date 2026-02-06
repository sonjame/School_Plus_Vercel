import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    // 🔐 관리자 체크
    if (decoded.level !== 'admin') {
      return NextResponse.json({ message: 'forbidden' }, { status: 403 })
    }

    const { id } = await context.params // ⭐ 핵심 수정
    const { hidden } = await req.json()

    await db.query(
      `
      UPDATE posts
      SET is_hidden = ?
      WHERE id = ?
      `,
      [hidden ? 1 : 0, id],
    )

    return NextResponse.json({
      success: true,
      hidden: !!hidden,
    })
  } catch (e) {
    console.error('❌ admin hide post error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
