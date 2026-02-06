import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  const auth = req.headers.get('authorization')
  if (!auth) return NextResponse.json({ success: false }, { status: 401 })

  const token = auth.replace('Bearer ', '')
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)

  if (decoded.level !== 'admin') {
    return NextResponse.json({ success: false }, { status: 403 })
  }

  const { id } = await req.json()

  await db.query(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id])

  return NextResponse.json({ success: true })
}
