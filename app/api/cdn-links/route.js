import { NextResponse } from "next/server";

function sanitizePrefixPart(value) {
  return String(value || "tracks").replace(/^\/+|\/+$/g, "");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const s3ListPath = process.env.BACKEND_S3_LIST_PATH || "/api/s3/list";
    const tracksPrefix = sanitizePrefixPart(process.env.BACKEND_S3_TRACKS_PREFIX || "tracks");
    const cdnBase = (
      process.env.CDN_BASE_URL
      || process.env.BACKEND_CDN_PATH
      || "https://d23du7ibe4a1ni.cloudfront.net"
    ).replace(/\/+$/g, "");
    const bearer = process.env.API_BEARER || "";
    const prefix = `${tracksPrefix}/${videoId}/`;

    const headers = {};
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const response = await fetch(
      `${apiBase}${s3ListPath}?prefix=${encodeURIComponent(prefix)}`,
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
          endpoint: `${apiBase}${s3ListPath}`,
          prefix,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    const contents = Array.isArray(result?.contents) ? result.contents : [];

    const karaokeKey = `${prefix}karaoke.mp3`;
    const vocalsKey = `${prefix}vocals.mp3`;

    const hasKaraoke = contents.some((item) => String(item?.Key || "") === karaokeKey);
    const hasVocals = contents.some((item) => String(item?.Key || "") === vocalsKey);

    const links = [];
    if (hasKaraoke) {
      links.push({
        label: "Karaoke",
        url: `${cdnBase}/${encodeURIComponent(videoId)}/karaoke.mp3`,
      });
    }
    if (hasVocals) {
      links.push({
        label: "Vocals",
        url: `${cdnBase}/${encodeURIComponent(videoId)}/vocals.mp3`,
      });
    }

    return NextResponse.json({
      ok: true,
      videoId,
      prefix,
      files: {
        karaoke: hasKaraoke,
        vocals: hasVocals,
      },
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
