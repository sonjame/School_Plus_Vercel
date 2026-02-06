import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import jwt, { TokenExpiredError } from 'jsonwebtoken'

export async function GET(req: Request) {
  try {
    /* 1️⃣ 토큰 확인 */
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

    /* 2️⃣ 친구 목록 조회 */
    const [rows]: any = await db.query(
      `
SELECT
  u.id,
  u.name,
  u.username,
  u.profile_image_url AS profileImageUrl,
  CONCAT(u.grade, '학년 ', u.class_num, '반') AS gradeLabel
FROM friends f
JOIN users u
  ON u.id = f.friend_id
LEFT JOIN blocks b
  ON b.user_id = f.user_id
 AND b.blocked_id = f.friend_id
WHERE f.user_id = ?
  AND b.id IS NULL
ORDER BY u.name ASC;
  `,
      [userId],
    )

    return NextResponse.json(rows)
  } catch (e) {
    console.error('[GET FRIENDS ERROR]', e)
    return NextResponse.json({ message: 'SERVER_ERROR' }, { status: 500 })
  }
}
