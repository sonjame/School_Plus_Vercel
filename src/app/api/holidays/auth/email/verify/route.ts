import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    const { code } = await req.json();

    if (code === globalThis.emailVerifyCode) {
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false });
}
