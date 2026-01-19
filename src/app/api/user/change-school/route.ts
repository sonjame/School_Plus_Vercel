import { NextResponse } from 'next/server'
import { db } from '@/src/lib/db'

export async function POST(req: Request) {
  try {
    const { username, school, eduCode, schoolCode } = await req.json()

    if (!username || !school || !eduCode || !schoolCode) {
      return NextResponse.json(
        { message: '요청 값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    await db.query(
      `UPDATE users 
   SET school = ?, edu_code = ?, school_code = ?
   WHERE username = ?`,
      [school, eduCode, schoolCode, username]
    )

    // ✅ 반드시 JSON 반환
    return NextResponse.json(
      {
        message: '학교 변경 완료',
        school,
        eduCode,
        schoolCode,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('학교 변경 API 오류:', err)

    // ✅ 에러여도 JSON 반환
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
