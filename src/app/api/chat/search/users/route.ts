import db from '@/src/lib/db'
import { NextResponse } from 'next/server'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function GET(req: Request) {
  try {
    /* 1️⃣ 토큰에서 userId 추출 */
    const auth = req.headers.get('authorization')
    if (!auth) {
      return NextResponse.json({ message: 'NO_TOKEN' }, { status: 401 })
    }

    const token = auth.replace('Bearer ', '')

    let userId: number
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number
      }
      userId = decoded.id
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return NextResponse.json({ message: 'TOKEN_EXPIRED' }, { status: 401 })
      }
      return NextResponse.json({ message: 'INVALID_TOKEN' }, { status: 401 })
    }

    /* 2️⃣ 쿼리 파라미터 */
    const { searchParams } = new URL(req.url)
    const keyword = searchParams.get('name')
    const grade = searchParams.get('grade')
    const classNum = searchParams.get('classNum')
    const schoolCode = searchParams.get('schoolCode')
    const onlyFriends = searchParams.get('onlyFriends') === 'true'

    if (!schoolCode) {
      return NextResponse.json([])
    }

    /* 3️⃣ SQL */
    let sql = `
      SELECT
        u.id,
        u.name,
        u.username,
        u.profile_image_url AS profileImageUrl,
        CONCAT(u.grade, ' ', u.class_num, '반') AS gradeLabel,
        CASE
          WHEN b.id IS NOT NULL THEN 1
          ELSE 0
        END AS isBlocked
      FROM users u
    `

    const params: any[] = []

    /* ✅ 친구만 검색 */
    if (onlyFriends) {
      sql += `
        INNER JOIN friends f
          ON f.friend_id = u.id
         AND f.user_id = ?
      `
      params.push(userId)
    }

    /* 🔹 차단 여부 */
    sql += `
      LEFT JOIN blocks b
        ON b.user_id = ?
       AND b.blocked_id = u.id
      WHERE u.school_code = ?
        AND u.level != 'admin'
        AND u.id != ?
    `
    params.push(userId, schoolCode, userId)

    /* 🔹 이름 검색 */
    if (keyword) {
      sql += ` AND u.name LIKE ?`
      params.push(`%${keyword}%`)
    }

    /* 🔹 학년 / 반 검색 */
    if (grade && classNum) {
      sql += ` AND u.grade = ? AND u.class_num = ?`
      params.push(`${grade}학년`, Number(classNum))
    }

    sql += ` ORDER BY u.name ASC`

    const [rows] = await db.query(sql, params)

    return NextResponse.json(Array.isArray(rows) ? rows : [])
  } catch (err) {
    console.error('[SEARCH USERS ERROR]', err)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
