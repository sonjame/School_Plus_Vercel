import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }

    await db.query('DELETE FROM notifications WHERE user_id = ?', [decoded.id])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('알림 전체 삭제 실패:', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
