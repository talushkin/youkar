import { NextResponse } from "next/server";

function parseDurationToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const raw = String(value || "").trim();
  if (!raw) return null;

  // mm:ss or hh:mm:ss
  if (raw.includes(":")) {
    const parts = raw.split(":").map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // ISO-8601 style durations like PT7M32S
  const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (iso) {
    const hours = Number(iso[1] || 0);
    const minutes = Number(iso[2] || 0);
    const seconds = Number(iso[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
  }

  // plain numeric string, interpreted as seconds
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;

  return null;
}

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
      const duration = item?.duration || item?.length || item?.videoDuration || "";

      if (!youtubeUrl || !title) {
        return null;
      }

      return {
        id: String(videoId || youtubeUrl || index),
        title: String(title),
        artist: String(artist || ""),
        duration: String(duration || ""),
        youtubeUrl: String(youtubeUrl),
      };
    })
    .filter(Boolean);

  const seen = new Set();
  return mapped.filter((song) => {
    const durationSeconds = parseDurationToSeconds(song.duration);
    if (durationSeconds !== null && durationSeconds > 7 * 60) {
      return false;
    }

    if (seen.has(song.youtubeUrl)) {
      return false;
    }
    seen.add(song.youtubeUrl);
    return true;
  });
}

async function fetchYoutubeSongsDirect({ title, artist, genre }) {
  const apiKey = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) {
    return [];
  }

  const query = [title, artist, genre].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
  if (!query) {
    return [];
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    maxResults: "10",
    q: query,
  });

  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    { cache: "no-store" }
  );

  if (!searchResponse.ok) {
    throw new Error(`YouTube search failed: ${searchResponse.status} ${searchResponse.statusText}`);
  }

  const searchBody = await searchResponse.json();
  const items = Array.isArray(searchBody?.items) ? searchBody.items : [];
  const ids = items
    .map((item) => String(item?.id?.videoId || "").trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return [];
  }

  const detailsParams = new URLSearchParams({
    key: apiKey,
    part: "contentDetails",
    id: ids.join(","),
  });

  const detailsResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${detailsParams.toString()}`,
    { cache: "no-store" }
  );

  if (!detailsResponse.ok) {
    throw new Error(`YouTube details failed: ${detailsResponse.status} ${detailsResponse.statusText}`);
  }

  const detailsBody = await detailsResponse.json();
  const durationById = new Map(
    (Array.isArray(detailsBody?.items) ? detailsBody.items : []).map((item) => [
      String(item?.id || ""),
      String(item?.contentDetails?.duration || ""),
    ])
  );

  const songs = items
    .map((item, index) => {
      const videoId = String(item?.id?.videoId || "").trim();
      const titleValue = String(item?.snippet?.title || "").trim();
      if (!videoId || !titleValue) {
        return null;
      }

      return {
        id: String(videoId || index),
        title: titleValue,
        artist: String(item?.snippet?.channelTitle || "").trim(),
        duration: durationById.get(videoId) || "",
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      };
    })
    .filter(Boolean);

  return normalizeSongs(songs)
    .sort((a, b) => {
      const aDuration = parseDurationToSeconds(a.duration);
      const bDuration = parseDurationToSeconds(b.duration);
      const aRank = aDuration === null ? Number.POSITIVE_INFINITY : aDuration;
      const bRank = bDuration === null ? Number.POSITIVE_INFINITY : bDuration;
      return aRank - bRank;
    })
    .slice(0, 5);
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

    try {
      const songs = await fetchYoutubeSongsDirect({ title, artist, genre });
      if (songs.length > 0) {
        return NextResponse.json({
          ok: true,
          songs,
          payload: { title, artist, genre },
          source: "youtube-data-api",
          backend: null,
        });
      }
    } catch {
      // If direct YouTube search fails, fall back to the existing backend service.
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
    const songs = normalizeSongs(backendBody)
      .sort((a, b) => {
        const aDuration = parseDurationToSeconds(a.duration);
        const bDuration = parseDurationToSeconds(b.duration);
        const aRank = aDuration === null ? Number.POSITIVE_INFINITY : aDuration;
        const bRank = bDuration === null ? Number.POSITIVE_INFINITY : bDuration;
        return aRank - bRank;
      })
      .slice(0, 5);
    return NextResponse.json({ ok: true, songs, payload, source: "backend", backend: backendBody });
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