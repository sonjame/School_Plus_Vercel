import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await context.params

    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const { type, content } = await req.json()

    if (!type) {
      return NextResponse.json(
        { message: '신고 유형이 필요합니다.' },
        { status: 400 }
      )
    }

    await db.query(
      `
      INSERT INTO post_reports (post_id, user_id, type, content)
      VALUES (?, ?, ?, ?)
      `,
      [postId, userId, type, content || null]
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ report error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
