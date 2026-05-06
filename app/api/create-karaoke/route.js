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

function nowAsCreatedString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function getVideoTitle(videoId) {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      cache: "no-store",
    });
    if (!response.ok) return "Unknown";
    const data = await response.json();
    return data.title || "Unknown";
  } catch {
    return "Unknown";
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const youtubeUrl = body?.youtubeUrl || "";
    const fromPhone = String(body?.fromPhone || "").trim();
    const userLang = body?.userLang === "HE" || body?.userLang === "he" ? "HE" : "EN";

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    const title = await getVideoTitle(videoId);

    const entry = {
      videoId,
      link: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      percent: "",
      created: nowAsCreatedString(),
      completed: null,
      startedStems: null,
      finishStems: null,
      duration: "N/A",
      voc: null,
      kar: null,
      meta: {
        playlistId: null,
        playlistName: null,
        source: "spotit-FE",
        kind: "karaoke-missing",
        fromPhone: fromPhone || null,
        userLang,
      },
    };

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const bearer = process.env.API_BEARER || "";

    const headers = { "Content-Type": "application/json" };
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const pendingUrl = `${apiBase}/api/pending`;
    const pendingBody = JSON.stringify([entry]);

    const response = await fetch(pendingUrl, {
      method: "POST",
      headers,
      body: pendingBody,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Backend API failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    let pendingContent = null;
    try {
      const pendingResponse = await fetch(pendingUrl, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (pendingResponse.ok) {
        pendingContent = await pendingResponse.json();
      }
    } catch {
      pendingContent = null;
    }

    return NextResponse.json({
      ok: true,
      queuedVideoId: videoId,
      title,
      backend: result,
      pendingContent,
      backendCall: {
        url: pendingUrl,
        method: "POST",
        hasBearer: Boolean(bearer),
        body: pendingBody,
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
