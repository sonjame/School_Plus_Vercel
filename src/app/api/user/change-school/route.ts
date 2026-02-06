import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

export async function POST(req: Request) {
  try {
    const { username, school, eduCode, schoolCode } = await req.json()

    if (!username || !school || !eduCode || !schoolCode) {
      return NextResponse.json(
        { message: '요청 값이 올바르지 않습니다.' },
        { status: 400 },
      )
    }

    /* 🔥 학교명으로 level 자동 판별 */
    let level = 'middle'

    if (school.includes('고등학교')) level = '고등학교'
    else if (school.includes('중학교')) level = '중학교'
    else if (school.includes('초등학교')) level = '초등학교'

    /* ✅ users 테이블 업데이트 */
    await db.query(
      `
      UPDATE users
      SET
        school = ?,
        edu_code = ?,
        school_code = ?,
        level = ?
      WHERE username = ?
      `,
      [school, eduCode, schoolCode, level, username],
    )

    /* ✅ 프론트에서 바로 반영 가능하게 level 포함 */
    return NextResponse.json(
      {
        message: '학교 변경 완료',
        school,
        eduCode,
        schoolCode,
        level,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('학교 변경 API 오류:', err)

    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
