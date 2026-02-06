import { NextResponse } from 'next/server'
import db from '@/src/lib/db'

const DEFAULT_IMAGE = '/default-profile.svg'

export async function POST(req: Request) {
  try {
    const { userId, profileImageUrl } = await req.json()

    if (!userId || !profileImageUrl) {
      return NextResponse.json({ message: '잘못된 요청' }, { status: 400 })
    }

    // 1️⃣ 현재 프로필 조회
    const [[user]]: any = await db.query(
      `SELECT profile_image_url FROM users WHERE id = ?`,
      [userId],
    )

    // 이미 같은 이미지면 아무 것도 안 함
    if (user?.profile_image_url === profileImageUrl) {
      return NextResponse.json({ profileImageUrl })
    }

    // 2️⃣ 히스토리 저장 (기본 이미지 제외)
    if (profileImageUrl !== DEFAULT_IMAGE) {
      await db.query(
        `
        INSERT INTO user_profile_images (user_id, image_url)
        VALUES (?, ?)
        `,
        [userId, profileImageUrl],
      )
    }

    // 3️⃣ 현재 프로필 업데이트
    await db.query(
      `
      UPDATE users
      SET profile_image_url = ?
      WHERE id = ?
      `,
      [profileImageUrl, userId],
    )

    return NextResponse.json({ profileImageUrl })
  } catch (err) {
    console.error('[CHANGE PROFILE IMAGE ERROR]', err)
    return NextResponse.json(
      { message: '프로필 이미지 변경 실패' },
      { status: 500 },
    )
  }
}
