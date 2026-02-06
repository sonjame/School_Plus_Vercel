import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    /* ✅ params는 Promise → 반드시 await */
    const { id } = await params
    const userId = Number(id)

    if (!userId) {
      return NextResponse.json({ message: 'invalid user id' }, { status: 400 })
    }

    /* 🧹 신고 기록 삭제 */
    await db.query(`DELETE FROM post_reports WHERE user_id = ?`, [userId])
    await db.query(`DELETE FROM comment_reports WHERE user_id = ?`, [userId])

    return NextResponse.json({
      ok: true,
      message: '신고 기록이 삭제되었습니다.',
    })
  } catch (e) {
    console.error('❌ delete reporter error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
