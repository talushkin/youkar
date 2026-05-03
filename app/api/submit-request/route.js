import { NextResponse } from "next/server";

function extractVideoId(link) {
  try {
    const url = new URL(link);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "") || null;
    }
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

function buildSubmitUrl() {
  const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
  const submitPath = process.env.BACKEND_SUBMIT_PATH || "/api/submit-request";

  if (submitPath.startsWith("http://") || submitPath.startsWith("https://")) {
    return submitPath;
  }

  return `${apiBase}${submitPath.startsWith("/") ? "" : "/"}${submitPath}`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const youtubeUrl = String(body?.youtubeUrl || "").trim();
    const providedVideoId = String(body?.videoId || "").trim();
    const phoneNumber = String(body?.phoneNumber || "").trim();

    const normalizedPhone = phoneNumber.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
    if (!/^\+?\d{8,15}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    const derivedVideoId = extractVideoId(youtubeUrl);
    const videoId = providedVideoId || derivedVideoId;
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const submitUrl = buildSubmitUrl();
    const bearer = process.env.API_BEARER || "";

    const headers = { "Content-Type": "application/json" };
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const payload = {
      phoneNumber: normalizedPhone,
      phone: normalizedPhone,
      whatsapp: normalizedPhone,
      youtubeUrl,
      videoId,
      source: "youkar-web",
    };

    const response = await fetch(submitUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const responseText = await response.text();
    let backendBody = null;
    try {
      backendBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      backendBody = { raw: responseText };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Backend API failed: ${response.status} ${response.statusText}`,
          backend: backendBody,
          backendCall: {
            url: submitUrl,
            method: "POST",
            hasBearer: Boolean(bearer),
            body: payload,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      backend: backendBody,
      backendCall: {
        url: submitUrl,
        method: "POST",
        hasBearer: Boolean(bearer),
        body: payload,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
