import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt from 'jsonwebtoken'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // ⭐ 반드시 await
    const { id: commentId } = await context.params

    /* 🔐 인증 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')
    let decoded: any

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!)
    } catch {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const userId = decoded.id
    const { type, content } = await req.json()

    if (!type) {
      return NextResponse.json({ message: '신고 유형 누락' }, { status: 400 })
    }

    /* ❌ 중복 신고 방지 */
    const [[exists]]: any = await db.query(
      `
      SELECT id FROM comment_reports
      WHERE comment_id = ? AND user_id = ?
      `,
      [commentId, userId],
    )

    if (exists) {
      return NextResponse.json({ message: 'already reported' }, { status: 409 })
    }

    /* ✅ 신고 저장 */
    await db.query(
      `
  INSERT INTO comment_reports (
    comment_id,
    user_id,
    type,
    content
  ) VALUES (?, ?, ?, ?)
  `,
      [commentId, userId, type, content ?? null],
    )

    /* =========================
🔔 관리자 알림 생성 (🔥 여기 추가)
========================= */

    // 1️⃣ 댓글 → 게시글 ID 가져오기
    const [[comment]]: any = await db.query(
      `SELECT post_id FROM post_comments WHERE id = ?`,
      [commentId],
    )

    const postId = comment?.post_id

    // 2️⃣ 관리자 조회
    const [admins]: any = await db.query(`
  SELECT id FROM users WHERE level = 'admin'
`)

    // 3️⃣ 알림 생성
    if (admins.length > 0) {
      const values = admins.map((a: any) => [
        a.id,
        'report_comment',
        '🚨 댓글 신고 접수',
        `댓글이 신고되었습니다. (사유: ${type})`,
        `/board/post/${postId}#comment-${commentId}`, // 🔥 댓글 위치 이동
      ])

      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES ?
    `,
        [values],
      )
    }

    /* =========================
🔥 신고 상태 반영 (⭐ 여기 추가)
========================= */

    // 🔥 신고 누적 수 확인
    const [[{ cnt }]]: any = await db.query(
      `
  SELECT COUNT(*) AS cnt
  FROM comment_reports
  WHERE comment_id = ?
  `,
      [commentId],
    )

    // 🔥 1번이라도 신고 → 표시 변경
    if (cnt >= 1) {
      await db.query(
        `
    UPDATE post_comments
    SET is_reported = 1
    WHERE id = ?
    `,
        [commentId],
      )
    }

    // 🔥 (선택) 3회 이상 → 숨김 처리
    if (cnt >= 3) {
      await db.query(
        `
    UPDATE post_comments
    SET is_hidden = 1
    WHERE id = ?
    `,
        [commentId],
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('❌ comment report error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
