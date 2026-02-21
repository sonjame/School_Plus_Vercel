import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    // 🔥 여기 추가
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }

      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    const userId = decoded.id

    const { year, grade, month, scores } = await req.json()

    if (!year || !grade || !month || !scores) {
      return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
    }

    for (const key of Object.keys(scores)) {
      const rawScore = scores[key]

      let subject = key
      let subType: string | null = null

      if (key.includes('_')) {
        const parts = key.split('_')
        subject = parts[0]
        subType = parts[1]
      }

      await db.query(
        `
        INSERT INTO mock_exam_scores
        (user_id, year, grade, month, subject, sub_type, raw_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE raw_score = VALUES(raw_score)
        `,
        [userId, year, grade, month, subject, subType, rawScore],
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ mock score save error', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
