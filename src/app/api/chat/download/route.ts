import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'NO_URL' }, { status: 400 })
  }

  const res = await fetch(url)
  if (!res.ok) {
    return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 500 })
  }

  const blob = await res.arrayBuffer()

  const filename = decodeURIComponent(url.split('/').pop() || 'file')

  return new NextResponse(blob, {
    headers: {
      'Content-Type':
        res.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
