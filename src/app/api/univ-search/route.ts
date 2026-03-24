import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const keyword = searchParams.get('q') // 학교명

  if (!keyword) {
    return NextResponse.json({ error: '검색어 없음' }, { status: 400 })
  }

  try {
    const apiKey = process.env.CAREER_API_KEY

    const url = `https://www.career.go.kr/cnet/openapi/getOpenApi?apiKey=${apiKey}&svcType=api&svcCode=SCHOOL&contentType=xml&gubun=univ_list&searchSchulNm=${encodeURIComponent(
      keyword,
    )}`

    const res = await fetch(url)
    const text = await res.text()

    return new NextResponse(text, {
      headers: { 'Content-Type': 'application/xml' },
    })
  } catch (e) {
    return NextResponse.json({ error: 'API 실패' }, { status: 500 })
  }
}
