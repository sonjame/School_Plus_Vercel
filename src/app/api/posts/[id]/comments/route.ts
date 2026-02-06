import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

/* 댓글 목록 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params

    let myUserId: number | null = null
    let isAdmin = false

    const authHeader = req.headers.get('authorization')

    let mySchoolCode: string | null = null

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
        myUserId = decoded.id
        isAdmin = decoded.level === 'admin'
        mySchoolCode = decoded.school_code
      } catch {}
    }

    const [rows]: any = await db.query(
      `
  SELECT
    c.id,
    c.content,
    c.author,
    c.parent_id,
    c.user_id,
    c.created_at,
    COUNT(cl.id) AS likes,
    MAX(cl.user_id = ?) AS likedByMe
  FROM post_comments c
  LEFT JOIN comment_likes cl ON c.id = cl.comment_id
  WHERE c.post_id = ?
  ${
    isAdmin
      ? ''
      : `
        AND c.is_hidden = 0
        AND (
          c.school_code IS NULL
          OR c.school_code = ?
        )
      `
  }
  GROUP BY
    c.id, c.content, c.author, c.parent_id, c.user_id, c.created_at
  ORDER BY c.created_at ASC
  `,
      isAdmin
        ? [myUserId ?? -1, postId]
        : [myUserId ?? -1, postId, mySchoolCode],
    )

    return NextResponse.json(
      rows.map((c: any) => ({
        id: c.id,
        content: c.content,
        author: c.author,
        parent: c.parent_id,
        user_id: c.user_id,
        created_at: c.created_at,
        likes: Number(c.likes),
        likedByMe: !!c.likedByMe,
      })),
    )
  } catch (e) {
    console.error('❌ GET comments error', e)
    return NextResponse.json([], { status: 500 })
  }
}

/* 댓글 작성 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params
    const { content, parent } = await req.json()

    if (!content) {
      return NextResponse.json({ message: 'content required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!)
    const userId = decoded.id

    const [[ban]]: any = await db.query(
      `SELECT is_banned, banned_at, banned_reason FROM users WHERE id = ?`,
      [userId],
    )

    // 🔴 영구 정지
    if (ban?.is_banned) {
      return NextResponse.json(
        { message: '영구 정지된 계정입니다.' },
        { status: 403 },
      )
    }

    // 🟡 기간 정지 (24h / 72h / 7d)
    if (ban?.banned_at) {
      const bannedAt = new Date(ban.banned_at).getTime()
      const now = Date.now()

      const durations: Record<string, number> = {
        '24h': 24 * 60 * 60 * 1000,
        '72h': 72 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      }

      const duration = durations[ban.banned_reason] ?? durations['24h']

      if (now < bannedAt + duration) {
        return NextResponse.json(
          { message: '일시 정지된 계정입니다.' },
          { status: 403 },
        )
      }
    }

    const [[user]]: any = await db.query(
      `SELECT name FROM users WHERE id = ?`,
      [userId],
    )

    // ⭐ 핵심
    const commentAuthor = decoded.level === 'admin' ? '관리자' : user.name

    /* =========================
   🔒 관리자 게시판 댓글 권한 체크
========================= */
    const isAdmin = decoded.level === 'admin'

    const [[post]]: any = await db.query(
      `
  SELECT
    p.user_id,
    p.category,
    u.level AS author_level
  FROM posts p
  JOIN users u ON p.user_id = u.id
  WHERE p.id = ?
  `,
      [postId],
    )

    if (!post) {
      return NextResponse.json({ message: '게시글 없음' }, { status: 404 })
    }
    if (post.category === 'admin') {
      const isAuthor = post.user_id === userId
      const postAuthorIsAdmin = post.author_level === 'admin'

      // 🔒 학생이 쓴 관리자 문의글
      if (!postAuthorIsAdmin) {
        // 작성자 or 관리자만 댓글 가능
        if (!isAuthor && !isAdmin) {
          return NextResponse.json(
            { message: '작성자 또는 관리자만 댓글을 작성할 수 있습니다.' },
            { status: 403 },
          )
        }
      }
      // ✅ 관리자가 쓴 공지글이면 아무 제한 없음 (누구나 댓글 가능)
    }

    // 🔑 댓글에 저장할 school_code 결정
    let commentSchoolCode: string | null = null

    if (post.category === 'admin') {
      if (post.author_level === 'admin') {
        // ✅ 관리자 공지글
        if (isAdmin) {
          // 관리자 댓글 → 전체 공개
          commentSchoolCode = null
        } else {
          // 학생 댓글 → 자기 학교만
          commentSchoolCode = decoded.school_code
        }
      } else {
        // 학생이 쓴 관리자 문의글 → 질문자 학교만
        const [[postAuthor]]: any = await db.query(
          `SELECT school_code FROM users WHERE id = ?`,
          [post.user_id],
        )
        commentSchoolCode = postAuthor?.school_code ?? null
      }
    } else {
      // 일반 게시판
      commentSchoolCode = decoded.school_code
    }

    const id = crypto.randomUUID()

    await db.query(
      `
    INSERT INTO post_comments
    (id, post_id, user_id, author, content, parent_id, school_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)

      `,
      [
        id,
        postId,
        userId,
        commentAuthor,
        content,
        parent ?? null,
        commentSchoolCode,
      ],
    )

    const [[postInfo]]: any = await db.query(
      `SELECT title FROM posts WHERE id = ?`,
      [postId],
    )

    /* =========================
  🔔 사용자 게시글에 달린 댓글 알림
  ========================= */
    if (
      !parent && // 최상위 댓글
      post.user_id !== userId // 글 작성자 ≠ 댓글 작성자
    ) {
      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          post.user_id,
          'post_commented',
          '💬 내 게시글에 댓글',
          `"${postInfo.title}" 글에 새로운 댓글이 달렸습니다.`,
          `/board/post/${postId}`,
        ],
      )
    }

    /* =========================
  🔔 관리자 게시글에 달린 댓글 알림 (⭐ 빠져있던 핵심)
  ========================= */
    if (
      !parent && // ⭐ 최상위 댓글
      post.author_level === 'admin' && // 게시글 작성자가 관리자
      !isAdmin // 댓글 작성자는 학생
    ) {
      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          post.user_id, // 관리자 게시글 작성자
          'admin_post_commented',
          '💬 내 게시글에 댓글',
          `"${postInfo.title}" 글에 새로운 댓글이 달렸습니다.`,
          `/board/post/${postId}`,
        ],
      )
    }

    let parentComment: {
      id: string
      content: string
      user_id: number
      level: string
    } | null = null

    if (parent) {
      const [[row]]: any = await db.query(
        `
    SELECT
      c.id,
      c.content,
      c.user_id,
      u.level
    FROM post_comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
    `,
        [parent],
      )

      parentComment = row ?? null
    }

    /* =========================
🔔 사용자 댓글에 달린 답글 알림
========================= */
    if (
      parentComment && // 답글이고
      parentComment.user_id !== userId // 본인 답글 제외
    ) {
      const preview =
        parentComment.content.length > 30
          ? parentComment.content.slice(0, 30) + '...'
          : parentComment.content

      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          parentComment.user_id, // ⭐ 댓글 작성자(사용자)
          'comment_reply',
          '↪ 내 댓글에 답글',
          `내 댓글 "${preview}"에 답글이 달렸습니다.`,
          `/board/post/${postId}#comment-${parentComment.id}`,
        ],
      )
    }

    /* =========================
🔔 관리자 댓글에 대한 답글 알림 (관리자 게시글 포함)
========================= */
    if (
      parentComment &&
      parentComment.level === 'admin' && // 부모 댓글이 관리자
      parentComment.user_id !== userId // 본인 답글 제외
    ) {
      const preview =
        parentComment.content.length > 30
          ? parentComment.content.slice(0, 30) + '...'
          : parentComment.content

      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          parentComment.user_id, // ⭐ 해당 관리자에게만
          'admin_comment_reply',
          '↪ 내 댓글에 답글',
          `내 댓글 "${preview}" 에 답글이 달렸습니다.`,
          `/board/post/${postId}#comment-${parentComment.id}`,
        ],
      )
    }

    /* =========================
🔔 관리자 게시글에 달린 답글 알림
========================= */
    if (
      parentComment && // 답글이고
      post.author_level === 'admin' && // 게시글 작성자가 관리자
      !isAdmin // 답글 작성자는 학생
    ) {
      const preview =
        parentComment.content.length > 30
          ? parentComment.content.slice(0, 30) + '...'
          : parentComment.content

      // 관리자 전원 or 게시글 작성 관리자만
      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          post.user_id, // ⭐ 관리자 게시글 작성자
          'admin_post_reply',
          '↪ 관리자 게시글에 답글',
          `내 게시글의 댓글 "${preview}"에 답글이 달렸습니다.`,
          `/board/post/${postId}#comment-${parentComment.id}`,
        ],
      )
    }

    /* =========================
   🔔 관리자 문의 추가 댓글 알림 (학생 → 관리자)
========================= */
    if (
      post.category === 'admin' && // 관리자 게시판
      post.author_level !== 'admin' && // 학생이 쓴 문의글
      !isAdmin // 댓글 작성자도 학생
    ) {
      const [admins]: any = await db.query(`
    SELECT id FROM users WHERE level = 'admin'
  `)

      if (admins.length > 0) {
        const values = admins.map((a: any) => [
          a.id,
          'admin_question_followup',
          '📩 관리자 문의 추가 댓글',
          `"${postInfo.title}" 문의글에 새로운 댓글이 추가되었습니다.`,
          `/board/post/${postId}`, // ⭐ 해당 문의글로 이동
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
    }

    /* =========================
   🔔 관리자 답변 알림 생성
========================= */
    if (
      post.category === 'admin' && // 관리자 게시판
      isAdmin && // 댓글 작성자가 관리자
      post.user_id !== userId // 본인 글 제외
    ) {
      await db.query(
        `
    INSERT INTO notifications
      (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
    `,
        [
          post.user_id, // 질문자
          'admin_reply',
          '관리자 답변이 등록되었습니다',
          '질문하신 글에 관리자가 답변을 남겼습니다.',
          `/board/post/${postId}`,
        ],
      )
    }

    return NextResponse.json({
      id,
      content,
      author: commentAuthor,
      parent: parent ?? null,
      user_id: userId,
      created_at: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
    })
  } catch (e) {
    console.error('❌ POST comment error', e)
    return NextResponse.json({ message: 'server error' }, { status: 500 })
  }
}
