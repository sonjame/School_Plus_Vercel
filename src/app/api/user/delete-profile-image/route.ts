import { NextResponse } from 'next/server'
import db from '@/src/lib/db'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const DEFAULT_IMAGE = '/default-profile.svg'

export async function POST(req: Request) {
  try {
    const { profileImageId } = await req.json()

    // 1️⃣ 삭제할 프로필 이미지 조회 (user_id 기준)
    const [[image]]: any = await db.query(
      `
      SELECT id, image_url, user_id
      FROM user_profile_images
      WHERE id = ?
      `,
      [profileImageId],
    )

    if (!image) {
      return NextResponse.json(
        { message: '프로필 이미지를 찾을 수 없습니다.' },
        { status: 404 },
      )
    }

    const imageUrl: string = image.image_url
    const userId: number = image.user_id

    // 2️⃣ 현재 users 테이블의 프로필인지 확인
    const [[user]]: any = await db.query(
      `
      SELECT profile_image_url
      FROM users
      WHERE id = ?
      `,
      [userId],
    )

    const isCurrentProfile = user?.profile_image_url === imageUrl

    // 3️⃣ 현재 프로필이면 → 기본 이미지로 자동 변경
    if (isCurrentProfile) {
      await db.query(
        `
        UPDATE users
        SET profile_image_url = ?
        WHERE id = ?
        `,
        [DEFAULT_IMAGE, userId],
      )
    }

    // 4️⃣ S3 삭제 (기본 이미지 제외)
    if (
      imageUrl &&
      imageUrl !== DEFAULT_IMAGE &&
      imageUrl.includes('.amazonaws.com/')
    ) {
      const key = imageUrl.split('.amazonaws.com/')[1]

      if (key) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET!,
            Key: key,
          }),
        )
      }
    }

    // 5️⃣ DB 히스토리 삭제
    await db.query(`DELETE FROM user_profile_images WHERE id = ?`, [
      profileImageId,
    ])

    return NextResponse.json({
      success: true,
      currentProfileReset: isCurrentProfile,
    })
  } catch (err) {
    console.error('❌ 프로필 삭제 오류:', err)
    return NextResponse.json(
      { message: '프로필 이미지 삭제 실패' },
      { status: 500 },
    )
  }
}
