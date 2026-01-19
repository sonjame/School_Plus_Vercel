import { db } from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    // 🔐 인증
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const { grade, month, scores } = await req.json()

    if (!grade || !month || !scores) {
      return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
    }

    /*
      scores 예시:
      {
        "국어": 87,
        "수학": 92,
        "영어": 78,
        "한국사": 41,
        "통합사회": 46,
        "통합과학": 39
      }
    */

    for (const subject of Object.keys(scores)) {
      const rawScore = scores[subject]

      await db.query(
        `
        INSERT INTO mock_exam_scores
        (user_id, grade, month, subject, raw_score)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE raw_score = VALUES(raw_score)
        `,
        [userId, grade, month, subject, rawScore],
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ mock score save error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
