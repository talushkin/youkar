import { NextResponse } from "next/server";

function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return "Unknown";

  const rounded = Math.floor(total);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

async function getYouTubeMeta(videoId) {
  const fallback = {
    title: "YouTube song",
    duration: "Unknown",
  };

  if (!videoId) return fallback;

  try {
    const infoResponse = await fetch(
      `https://www.youtube.com/get_video_info?video_id=${encodeURIComponent(videoId)}&el=detailpage&hl=en`,
      { cache: "no-store" }
    );

    if (infoResponse.ok) {
      const raw = await infoResponse.text();
      const parsed = new URLSearchParams(raw);
      const playerResponseRaw = parsed.get("player_response");

      if (playerResponseRaw) {
        const playerResponse = JSON.parse(playerResponseRaw);
        const title = playerResponse?.videoDetails?.title || fallback.title;
        const duration = formatDuration(playerResponse?.videoDetails?.lengthSeconds);
        return { title, duration };
      }
    }
  } catch {
    // Fallback to oEmbed below.
  }

  try {
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&format=json`,
      { cache: "no-store" }
    );
    if (oembedResponse.ok) {
      const data = await oembedResponse.json();
      return {
        title: data?.title || fallback.title,
        duration: fallback.duration,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

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
  const submitPath = process.env.BACKEND_SUBMIT_PATH || "/api/wa/{phone}";

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

    const normalizedYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoMeta = await getYouTubeMeta(videoId);

    const submitUrlTemplate = buildSubmitUrl();
    const submitUrl = submitUrlTemplate.includes("{phone}")
      ? submitUrlTemplate.replace("{phone}", encodeURIComponent(normalizedPhone))
      : `${submitUrlTemplate.replace(/\/$/, "")}/${encodeURIComponent(normalizedPhone)}`;
    const bearer = process.env.API_BEARER || "";

    const headers = { "Content-Type": "application/json" };
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const payload = {
      title: "YouKar Verification",
      text: `✅ Your request was received.\n📞 Phone: ${normalizedPhone}\n🎵 Title: ${videoMeta.title}\n⏱️ Duration: ${videoMeta.duration}\n🔗 YouTube: ${normalizedYoutubeUrl}\n🎤 We will update you here once karaoke is ready.`,
      phoneNumber: normalizedPhone,
      youtubeUrl: normalizedYoutubeUrl,
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
