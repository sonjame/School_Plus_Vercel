import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ success: false }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

    // 관리자만
    if (decoded.level !== 'admin') {
      return NextResponse.json({ success: false }, { status: 403 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await db.query(`DELETE FROM notifications WHERE id = ?`, [id])

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ delete notification error', e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
