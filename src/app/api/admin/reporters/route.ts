import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function GET(req: Request) {
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

    /* 📋 신고자 목록 (게시글 + 댓글 신고 통합) */
    const [rows]: any = await db.query(`
  SELECT
    u.id            AS user_id,
    u.name          AS name,

    /* ✅ 정지 여부를 여기서 계산 */
    CASE
      WHEN u.is_banned = 1 OR u.banned_reason IS NOT NULL
      THEN TRUE
      ELSE FALSE
    END AS is_banned,

    u.banned_reason AS banned_reason,
    COUNT(*)        AS report_count,
    MAX(r.created_at) AS last_reported_at
  FROM (
    SELECT user_id, created_at FROM post_reports
    UNION ALL
    SELECT user_id, created_at FROM comment_reports
  ) r
  JOIN users u ON u.id = r.user_id
  GROUP BY
    u.id,
    u.name,
    u.is_banned,
    u.banned_reason
  ORDER BY report_count DESC
`)

    return NextResponse.json({
      ok: true,
      reporters: rows,
    })
  } catch (e) {
    console.error('❌ admin reporters error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
