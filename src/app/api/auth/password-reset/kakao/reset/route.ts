import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import bcrypt from 'bcrypt'

export async function POST(req: Request) {
  try {
    const { username, newPassword } = await req.json()

    if (!username || !newPassword) {
      return NextResponse.json(
        { message: '잘못된 요청입니다.' },
        { status: 400 },
      )
    }

    const hashed = await bcrypt.hash(newPassword, 10)

    const [result]: any = await db.query(
      `
      UPDATE users
      SET password = ?
      WHERE username = ?
        AND provider = 'kakao'
      `,
      [hashed, username],
    )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: '계정을 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      message: '비밀번호 변경 완료',
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ message: '서버 내부 오류' }, { status: 500 })
  }
}
