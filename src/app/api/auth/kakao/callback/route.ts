import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code received" }, { status: 400 });
    }

    // 1) 토큰 요청
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: process.env.KAKAO_REST_API_KEY || "",
            redirect_uri: process.env.KAKAO_REDIRECT_URI || "",
            code,
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
        console.log("카카오 토큰 오류:", tokenData);
        return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
    }

    // 2) 사용자 정보 요청
    const userRes = await fetch("https://kapi.kakao.com/v2/user/me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const user = await userRes.json();
    console.log("카카오 사용자:", user);

    // ⭐ 안전하게 값 추출 (undefined 방지)
    const id = user.id;
    const email = user.kakao_account?.email || "";
    const name = user.kakao_account?.profile?.nickname || "사용자";
    const profile = user.kakao_account?.profile?.profile_image_url || "";

    // 3) signup으로 redirect
    return NextResponse.redirect(
        `http://localhost:3000/auth/signup?verified=1&id=${id}&name=${encodeURIComponent(
            name
        )}&email=${email}&profile=${encodeURIComponent(profile)}`
    );
}
