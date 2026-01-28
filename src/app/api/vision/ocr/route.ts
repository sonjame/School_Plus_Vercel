import { NextResponse } from 'next/server'
import vision from '@google-cloud/vision'

export async function POST(req: Request) {
  try {
    // 🔥 환경변수에서 서비스 계정 JSON 읽기
    const credentials = JSON.parse(process.env.GOOGLE_VISION_KEY!)

    const client = new vision.ImageAnnotatorClient({
      credentials,
    })

    const formData = await req.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json({ error: '이미지 없음' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const [result] = await client.textDetection({
      image: { content: buffer },
    })

    const text = result.fullTextAnnotation?.text ?? ''

    return NextResponse.json({ text })
  } catch (err) {
    console.error('Vision OCR Error:', err)
    return NextResponse.json({ error: 'OCR 실패' }, { status: 500 })
  }
}
