import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No code" });
    }

    // 🔵 access token 요청
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            grant_type: "authorization_code",
        }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
        return NextResponse.json({ error: "Token error" });
    }

    // 🔵 사용자 정보 조회
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    const user = await userRes.json();

    console.log("구글 사용자 정보:", user);

    const id = user.id;
    const name = user.name;
    const email = user.email;
    const picture = user.picture;

    // 🔥 signup 페이지로 사용자 정보 전달
    return NextResponse.redirect(
        `http://localhost:3000/auth/signup?verified=1&id=${id}&name=${encodeURIComponent(
            name
        )}&email=${email}&picture=${encodeURIComponent(picture)}`
    );
}
