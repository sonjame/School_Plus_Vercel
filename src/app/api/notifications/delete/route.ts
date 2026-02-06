import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

/* ==============================
   ❌ 알림 삭제
============================== */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const userId = decoded.id
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // 🔥 본인 알림만 삭제 가능
    await db.query(
      `
      DELETE FROM notifications
      WHERE id = ? AND user_id = ?
      `,
      [id, userId],
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ notifications delete error', e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
