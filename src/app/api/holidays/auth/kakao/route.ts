import { NextResponse } from "next/server";

const REST_API_KEY = process.env.KAKAO_REST_API_KEY!;
const REDIRECT_URI = process.env.KAKAO_REDIRECT_URI!;

export async function GET() {
    const kakaoAuthUrl =
        `https://kauth.kakao.com/oauth/authorize?response_type=code` +
        `&client_id=${REST_API_KEY}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    return NextResponse.redirect(kakaoAuthUrl);
}
