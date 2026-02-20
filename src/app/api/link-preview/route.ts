import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'
import he from 'he'

function cleanTitle(title: string, domain: string) {
  if (domain.includes('naver')) {
    return title.replace(' : 네이버 지도', '').trim()
  }

  if (domain.includes('kakao')) {
    return title.replace(' - 카카오맵', '').trim()
  }

  if (domain.includes('google')) {
    return title.replace(' - Google 지도', '').trim()
  }

  return title
}

function detectMapType(url: string) {
  if (url.includes('naver.me') || url.includes('map.naver.com')) {
    return 'naver'
  }
  if (url.includes('kakao.com') || url.includes('map.kakao.com')) {
    return 'kakao'
  }
  if (url.includes('google.com/maps') || url.includes('goo.gl/maps')) {
    return 'google'
  }
  return null
}

async function fetchGooglePlaceData(query: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    query,
  )}&inputtype=textquery&fields=place_id,name,formatted_address,rating,photos&language=ko&region=kr&key=${apiKey}`

  const res = await axios.get(searchUrl)
  const place = res.data.candidates?.[0]

  if (!place) return null

  let photoUrl = null

  if (place.photos && place.photos.length > 0) {
    const photoRef = place.photos[0].photo_reference

    // 🔥 더 안정적인 photo URL
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photoreference=${photoRef}&language=ko&key=${apiKey}`
  }

  return {
    name: place.name,
    address: place.formatted_address,
    rating: place.rating,
    photo: photoUrl,
  }
}

async function resolveGoogleShortUrl(url: string) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    })

    return res.request?.res?.responseUrl || url
  } catch {
    return url
  }
}

function extractPlaceNameFromGoogleUrl(url: string) {
  const match = url.match(/\/place\/([^\/]+)/)
  if (!match) return null

  return decodeURIComponent(match[1].replace(/\+/g, ' '))
}

async function fetchNaverPlaceData(query: string) {
  const clientId = process.env.NAVER_CLIENT_ID
  const clientSecret = process.env.NAVER_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.log('NAVER ENV MISSING')
    return null
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(
      query,
    )}&display=1`

    const res = await axios.get(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    })

    const item = res.data.items?.[0]
    if (!item) return null

    return {
      name: he.decode(item.title.replace(/<[^>]+>/g, '')),
      address: item.roadAddress || item.address,
      photo: null,
    }
  } catch (err: any) {
    console.log('NAVER API ERROR:', err.response?.data)
    return null
  }
}

async function resolveNaverShortUrl(url: string) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    return res.request?.res?.responseUrl || url
  } catch {
    return url
  }
}

async function fetchKakaoPlaceData(query: string) {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) return null

  try {
    const res = await axios.get(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `KakaoAK ${apiKey}`,
        },
      },
    )

    const place = res.data.documents?.[0]
    if (!place) return null

    return {
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      lat: place.y,
      lng: place.x,
    }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'NO_URL' }, { status: 400 })
  }

  try {
    // =========================
    // 🔥 YouTube는 OEmbed API 사용 (Vercel 대응)
    // =========================
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      try {
        const oembed = await axios.get(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            url,
          )}&format=json`,
        )

        return NextResponse.json({
          title: oembed.data.title,
          description: 'YouTube',
          image: oembed.data.thumbnail_url,
          url,
          type: 'link',
          provider: 'youtube',
        })
      } catch {
        // 실패하면 아래 일반 크롤링으로 진행
      }
    }
    const { data, request } = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      },
    })

    const finalUrl = request?.res?.responseUrl || url
    const mapType = detectMapType(finalUrl)

    const $ = cheerio.load(data)

    const rawTitle =
      $('meta[property="og:title"]').attr('content') ?? $('title').text() ?? ''

    const rawDescription =
      $('meta[property="og:description"]').attr('content') ??
      $('meta[name="description"]').attr('content') ??
      ''

    const rawImage = $('meta[property="og:image"]').attr('content') ?? null

    const title = rawTitle ? he.decode(rawTitle) : ''
    const description = rawDescription ? he.decode(rawDescription) : ''

    // 🔥 지도 전용 처리
    let finalTitle = title

    if (mapType && finalTitle) {
      finalTitle = cleanTitle(finalTitle, mapType)
    }

    /* =========================
    🔥 Google 지도 → Places API
    ========================= */
    if (mapType === 'google') {
      let realUrl = finalUrl

      if (realUrl.includes('maps.app.goo.gl')) {
        realUrl = await resolveGoogleShortUrl(realUrl)
      }

      const placeName = extractPlaceNameFromGoogleUrl(realUrl)

      if (placeName) {
        const placeData = await fetchGooglePlaceData(placeName)

        if (placeData) {
          return NextResponse.json({
            title: `📍 ${placeData.name}`,
            description: placeData.address,
            image: placeData.photo || rawImage, // 🔥 사진 없으면 OG fallback
            rating: placeData.rating,
            url: realUrl,
            type: 'map',
            provider: 'google',
          })
        }
      }
    }

    /* =========================
🔥 KAKAO 지도
========================= */

    if (mapType === 'kakao') {
      let realUrl = finalUrl

      // 🔥 kko.to 단축링크면 한 번 더 요청해서 실제 URL 얻기
      if (realUrl.includes('kko.to')) {
        const redirectRes = await axios.get(realUrl, {
          maxRedirects: 5,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })

        realUrl = redirectRes.request?.res?.responseUrl || realUrl
      }

      // 🔥 실제 페이지 다시 요청
      const pageRes = await axios.get(realUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })

      const $$ = cheerio.load(pageRes.data)

      const ogTitle = $$('meta[property="og:title"]').attr('content') ?? ''
      const ogDesc = $$('meta[property="og:description"]').attr('content') ?? ''
      const ogImage = $$('meta[property="og:image"]').attr('content') ?? null

      const cleanedTitle = ogTitle.replace(' - 카카오맵', '').trim()

      return NextResponse.json({
        title: `📍 ${cleanedTitle || '카카오맵'}`,
        description: ogDesc,
        image: ogImage,
        url: realUrl,
        type: 'map',
        provider: 'kakao',
      })
    }

    /* =========================
    🔥 NAVER 지도
    ========================= */

    if (mapType === 'naver') {
      let realUrl = finalUrl

      if (realUrl.includes('naver.me')) {
        realUrl = await resolveNaverShortUrl(realUrl)
      }

      // 1️⃣ URL에서 placeId 추출
      const placeIdMatch = realUrl.match(/place\/(\d+)/)
      const placeId = placeIdMatch?.[1]

      let placeName = ''
      let placeAddress = ''

      if (placeId) {
        // 🔥 placeId를 검색어로 사용
        const placeData = await fetchNaverPlaceData(placeId)

        if (placeData) {
          placeName = placeData.name
          placeAddress = placeData.address
        }
      }

      // fallback
      if (!placeName) {
        placeName = finalTitle
      }

      return NextResponse.json({
        title: `📍 ${placeName || '네이버 지도'}`,
        description: placeAddress || description,
        image: rawImage,
        url: realUrl,
        type: 'map',
        provider: 'naver',
      })
    }

    return NextResponse.json({
      title: mapType ? `📍 ${finalTitle}` : title,
      description,
      image: rawImage, // 🔥 그대로 사용
      url: finalUrl,
      type: mapType ? 'map' : 'link',
      provider: mapType,
    })
  } catch (err) {
    return NextResponse.json({ error: 'FETCH_FAIL' }, { status: 500 })
  }
}
