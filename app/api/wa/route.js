import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, text, title } = body;

    if (!to || !text) {
      return NextResponse.json({ error: "to and text are required" }, { status: 400 });
    }

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const bearer = process.env.API_BEARER || "";

    const headers = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const response = await fetch(`${apiBase}/api/wa`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to,
        from: "14155238886",
        title: title || "Your Karaoke Files",
        text,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { ok: false, error: `Backend WA failed: ${response.status}`, details: errorText },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
