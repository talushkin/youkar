import { NextResponse } from "next/server";

function normalizeSongs(payload) {
  const candidates =
    payload?.songs ||
    payload?.songList ||
    payload?.results ||
    payload?.items ||
    payload?.data ||
    payload;

  if (!Array.isArray(candidates)) {
    return [];
  }

  const mapped = candidates
    .map((item, index) => {
      const videoId =
        item?.videoId ||
        item?.youtubeId ||
        item?.id?.videoId ||
        item?.id ||
        "";
      const youtubeUrl =
        item?.youtubeUrl ||
        item?.url ||
        item?.link ||
        (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "");
      const title = item?.title || item?.name || item?.songTitle || "";
      const artist = item?.artist || item?.channelTitle || item?.singer || "";

      if (!youtubeUrl || !title) {
        return null;
      }

      return {
        id: String(videoId || youtubeUrl || index),
        title: String(title),
        artist: String(artist || ""),
        youtubeUrl: String(youtubeUrl),
      };
    })
    .filter(Boolean);

  const seen = new Set();
  return mapped.filter((song) => {
    if (seen.has(song.youtubeUrl)) {
      return false;
    }
    seen.add(song.youtubeUrl);
    return true;
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const artist = String(body?.artist || "").trim();
    const genre = String(body?.genre || "").trim();

    if (title.length < 3) {
      return NextResponse.json({ songs: [] });
    }

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const bearer = process.env.API_BEARER || "1234";
    const endpoint = `${apiBase}/api/youtube/get-song-list`;

    const headers = { "Content-Type": "application/json" };
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, artist, genre }),
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
        },
        { status: 502 }
      );
    }

    const payload = { title, artist, genre };
    const songs = normalizeSongs(backendBody).slice(0, 5);
    return NextResponse.json({ ok: true, songs, payload, backend: backendBody });
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