import { NextResponse } from "next/server";

const apiBase = () => process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";

function getBackendHeaders(extra = {}) {
  const headers = { ...extra };
  const bearer = process.env.API_BEARER || "";
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  return headers;
}

function normalizeTextBody(input) {
  if (!input) return "";
  if (typeof input === "string") return input.trim();
  if (typeof input?.text === "string") return input.text.trim();
  if (typeof input?.log === "string") return input.log.trim();

  const event = typeof input?.event === "string" ? input.event.trim() : "";
  const payload = input?.payload !== undefined ? input.payload : null;
  if (!event && payload === null) return "";

  const compactPayload = payload === null ? "" : ` ${JSON.stringify(payload)}`;
  return `[FE] ${event || "log"}${compactPayload}`.trim();
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await request.json()
      : await request.text();

    const text = normalizeTextBody(body);
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const response = await fetch(`${apiBase()}/logs`, {
      method: "POST",
      headers: getBackendHeaders({ "Content-Type": "text/plain; charset=utf-8" }),
      body: text,
      cache: "no-store",
    });

    const responseText = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Backend logs POST failed: ${response.status}`,
          details: responseText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, forwarded: true, backend: responseText || null });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to forward log",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = (searchParams.get("view") || "show").toLowerCase();
    const path = view === "ulogs" ? "/ulogs" : "/show-logs";

    const response = await fetch(`${apiBase()}${path}`, {
      method: "GET",
      headers: getBackendHeaders(),
      cache: "no-store",
    });

    const html = await response.text();
    return new Response(html, {
      status: response.status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch logs view",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
