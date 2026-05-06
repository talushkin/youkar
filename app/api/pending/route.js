import { NextResponse } from "next/server";

function nowAsCreatedString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getBackendHeaders() {
  const bearer = process.env.API_BEARER || "";
  const headers = { "Content-Type": "application/json" };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  return headers;
}

const apiBase = () => process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    const url = videoId
      ? `${apiBase()}/api/pending?videoId=${encodeURIComponent(videoId)}`
      : `${apiBase()}/api/pending`;

    const response = await fetch(url, {
      method: "GET",
      headers: getBackendHeaders(),
      cache: "no-store",
    });

    const data = await response.json();

    // Normalize: backend may return raw array, { pending: [] }, or { array: [] }.
    const pending = Array.isArray(data)
      ? data
      : (Array.isArray(data?.pending) ? data.pending : (Array.isArray(data?.array) ? data.array : []));

    return NextResponse.json({
      ok: true,
      pending,
      count: pending.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch pending queue",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    // Accept either backend-style array payload or a single object payload.
    const incomingItems = Array.isArray(body) ? body : [body];

    const normalizedEntries = incomingItems
      .filter((item) => item && typeof item === "object")
      .map((incoming) => {
        const videoId = incoming?.videoId;
        if (!videoId) return null;

        const incomingMeta = incoming?.meta || {};

        return {
          videoId,
          link: incoming?.link || `https://www.youtube.com/watch?v=${videoId}`,
          title: incoming?.title || `YouTube ${videoId}`,
          percent: incoming?.percent ?? "",
          created: incoming?.created || nowAsCreatedString(),
          completed: incoming?.completed ?? null,
          startedStems: incoming?.startedStems ?? null,
          finishStems: incoming?.finishStems ?? null,
          duration: incoming?.duration || "N/A",
          voc: incoming?.voc ?? null,
          kar: incoming?.kar ?? null,
          meta: {
            playlistId: incomingMeta.playlistId ?? null,
            playlistName: incomingMeta.playlistName ?? null,
            source: incomingMeta.source || "spotit-FE",
            kind: incomingMeta.kind || "karaoke-missing",
          },
        };
      })
      .filter(Boolean);

    if (normalizedEntries.length === 0) {
      return NextResponse.json(
        { error: "videoId is required in at least one item" },
        { status: 400 }
      );
    }

    const backendUrl = `${apiBase()}/api/pending`;
    const backendHeaders = getBackendHeaders();
    const backendPayload = normalizedEntries;

    console.log("[api/pending][POST] Backend call", {
      url: backendUrl,
      bearer: backendHeaders.Authorization || "",
      payload: backendPayload,
    });

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: backendHeaders,
      body: JSON.stringify(backendPayload),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[api/pending][POST] Backend error", {
        url: backendUrl,
        status: response.status,
        statusText: response.statusText,
        bearer: backendHeaders.Authorization || "",
        payload: backendPayload,
        responseBody: errorText,
      });
      return NextResponse.json(
        {
          ok: false,
          error: `Backend returned ${response.status}`,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();

    console.log("[api/pending][POST] Backend success", {
      url: backendUrl,
      status: response.status,
      result,
    });

    // Mirror backend response shape so FE/internal tooling gets identical format.
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to add to pending queue",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
