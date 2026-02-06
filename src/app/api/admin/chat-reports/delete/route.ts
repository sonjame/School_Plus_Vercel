import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import db from '@/src/lib/db'

export async function POST(req: NextRequest) {
  try {
    /* 🔐 인증 */
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'UNAUTHORIZED' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }

    /* 🔐 관리자 확인 */
    const [[admin]]: any = await db.query(
      `SELECT level FROM users WHERE id = ? LIMIT 1`,
      [decoded.id],
    )

    if (!admin || admin.level !== 'admin') {
      return NextResponse.json({ message: 'FORBIDDEN' }, { status: 403 })
    }

    /* 📥 body */
    const { reportId } = await req.json()
    if (!reportId) {
      return NextResponse.json({ message: 'BAD_REQUEST' }, { status: 400 })
    }

    /* 🗑 신고 삭제 */
    await db.query(`DELETE FROM chat_reports WHERE id = ?`, [reportId])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[ADMIN CHAT REPORT DELETE ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
