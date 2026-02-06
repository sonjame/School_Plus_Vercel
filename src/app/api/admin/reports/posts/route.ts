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

    /* 📋 신고된 게시글 + 댓글 목록 조회 (신고자 ID + 정지 상태 포함) */
    const [rows]: any = await db.query(`
/* ===============================
   게시글 신고
=============================== */
SELECT
  'post'              AS target_type,
  p.id                AS target_id,
  p.title             AS title,

  -- 작성자
  u.id                AS author_id,
  u.name              AS author_name,

  -- 작성자 정지 정보
  u.is_banned         AS author_is_banned,
  u.banned_at         AS author_banned_at,
  u.banned_reason     AS author_banned_reason,

  COUNT(r.id)         AS report_count,

  -- 🔥 신고자 이름 (DISTINCT 제거)
  GROUP_CONCAT(
    ru.name
    ORDER BY r.created_at
    SEPARATOR ', '
  ) AS reporter_names,

  -- 🔥 신고자 ID (DISTINCT 제거)
  GROUP_CONCAT(
    ru.id
    ORDER BY r.created_at
    SEPARATOR ','
  ) AS reporter_ids,

  -- 🔥 신고자 정지 상태 (DISTINCT 제거 → 핵심)
  GROUP_CONCAT(
    ru.is_banned
    ORDER BY r.created_at
    SEPARATOR ','
  ) AS reporter_is_banned,

  GROUP_CONCAT(DISTINCT r.type) AS report_types,
  MAX(r.created_at)   AS last_reported_at,
  p.is_hidden         AS is_hidden,
  NULL                AS post_id

FROM post_reports r
JOIN posts p ON p.id = r.post_id
JOIN users u ON u.id = p.user_id        -- 작성자
JOIN users ru ON ru.id = r.user_id      -- 신고자
GROUP BY p.id, u.id

UNION ALL

/* ===============================
   댓글 신고
=============================== */
SELECT
  'comment'           AS target_type,
  c.id                AS target_id,
  CONCAT('💬 ', LEFT(c.content, 30)) AS title,

  -- 작성자
  u.id                AS author_id,
  u.name              AS author_name,

  -- 작성자 정지 정보
  u.is_banned         AS author_is_banned,
  u.banned_at         AS author_banned_at,
  u.banned_reason     AS author_banned_reason,

  COUNT(r.id)         AS report_count,

  -- 🔥 신고자 이름 (DISTINCT 제거)
  GROUP_CONCAT(
    ru.name
    ORDER BY r.created_at
    SEPARATOR ', '
  ) AS reporter_names,

  -- 🔥 신고자 ID (DISTINCT 제거)
  GROUP_CONCAT(
    ru.id
    ORDER BY r.created_at
    SEPARATOR ','
  ) AS reporter_ids,

  -- 🔥 신고자 정지 상태 (DISTINCT 제거 → 핵심)
  GROUP_CONCAT(
    ru.is_banned
    ORDER BY r.created_at
    SEPARATOR ','
  ) AS reporter_is_banned,

  GROUP_CONCAT(DISTINCT r.type) AS report_types,
  MAX(r.created_at)   AS last_reported_at,
  c.is_hidden         AS is_hidden,
  c.post_id           AS post_id

FROM comment_reports r
JOIN post_comments c ON c.id = r.comment_id
JOIN users u ON u.id = c.user_id         -- 작성자
JOIN users ru ON ru.id = r.user_id       -- 신고자
GROUP BY c.id, u.id

ORDER BY last_reported_at DESC
`)

    return NextResponse.json({
      ok: true,
      reports: rows,
    })
  } catch (e) {
    console.error('❌ admin reports error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
