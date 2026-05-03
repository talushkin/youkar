import { NextResponse } from "next/server";

function normalizeLinks(payload) {
  const links = [];

  if (!payload) return links;

  const source = payload.links || payload.files || payload.data?.links || payload.data?.files;

  if (Array.isArray(source)) {
    for (const item of source) {
      const url = item?.url || item?.link || item?.cdn;
      if (!url) continue;
      links.push({
        label: item?.label || item?.name || "Download file",
        url,
      });
    }
    return links;
  }

  const voc = payload.voc || payload.data?.voc;
  const kar = payload.kar || payload.data?.kar;

  if (voc) links.push({ label: "Vocals", url: voc });
  if (kar) links.push({ label: "Karaoke", url: kar });

  return links;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const linksPath = process.env.BACKEND_CDN_PATH || "/api/cdn-links";
    const bearer = process.env.API_BEARER || "";

    const headers = {};
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const response = await fetch(
      `${apiBase}${linksPath}?videoId=${encodeURIComponent(videoId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

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
    const links = normalizeLinks(result);

    return NextResponse.json({
      ok: true,
      videoId,
      links,
      raw: result,
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
