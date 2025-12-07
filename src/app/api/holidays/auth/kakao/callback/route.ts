import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code received" }, { status: 400 });
    }

    // 📌 카카오 토큰 요청
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.KAKAO_REST_API_KEY!,
            redirect_uri: process.env.KAKAO_REDIRECT_URI!,
            code,
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
        return NextResponse.json({ error: "Failed to get Kakao token" });
    }

    // 📌 사용자 정보 요청
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userRes.json();

    // 👉 여기서 user.id / user.kakao_account.email 등을 DB에 저장 가능
    console.log("카카오 사용자:", user);

    // 프론트로 redirect (verified=true 전달)
    return NextResponse.redirect("http://localhost:3000/auth/signup?verified=1");
}
