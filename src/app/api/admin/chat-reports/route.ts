import { NextRequest, NextResponse } from 'next/server'
import jwt, { TokenExpiredError } from 'jsonwebtoken'
import db from '@/src/lib/db'
import type { RowDataPacket } from 'mysql2'

export async function GET(req: NextRequest) {
  try {
    /* =====================
       1️⃣ 인증
    ===================== */
    const auth = req.headers.get('authorization')
    if (!auth?.startsWith('Bearer ')) {
      return NextResponse.json([], { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let payload: { id: number }

    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }
    } catch (err) {
      // ⭐⭐⭐ 핵심: 토큰 문제는 무조건 401
      if (err instanceof TokenExpiredError) {
        return NextResponse.json([], { status: 401 })
      }

      return NextResponse.json([], { status: 401 })
    }

    /* =====================
       2️⃣ 관리자 여부 DB 확인
    ===================== */
    const [users] = await db.query<RowDataPacket[]>(
      `SELECT level FROM users WHERE id = ? LIMIT 1`,
      [payload.id],
    )

    if (!users.length || (users[0] as any).level !== 'admin') {
      return NextResponse.json([], { status: 403 })
    }

    /* =====================
       3️⃣ 신고 목록 조회
    ===================== */
    type ReportRow = RowDataPacket & {
      id: number
      reporter: string
      reported: string
      reason: string
      created_at: string
    }

    const [rows] = await db.query<ReportRow[]>(
      `
    SELECT
    r.id,
    r.reason,
    r.created_at,
    r.reporter_id,          
    r.reported_user_id,     
    u1.username AS reporter,
    u2.username AS reported
  FROM chat_reports r
  JOIN users u1 ON u1.id = r.reporter_id
  JOIN users u2 ON u2.id = r.reported_user_id
  ORDER BY r.created_at DESC

      `,
    )

    return NextResponse.json(rows)
  } catch (err) {
    console.error('[ADMIN CHAT REPORT LIST ERROR]', err)
    // ⭐ 서버 진짜 오류일 때만 500
    return NextResponse.json([], { status: 500 })
  }
}
