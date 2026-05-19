import { NextResponse } from "next/server";
//add has requests and has meta.json to response, so we can show in UI if track is requested and has meta info. also add raw response for debugging.
//from meta.json we can get title, artist, and requests count. if requests is high, we can prioritize it in UI. if meta is missing, we can show a warning in UI and maybe deprioritize it.
//from requests count we can also show a "hotness" indicator in UI, like a flame icon if requests > 10, or something like that. this can encourage users to request tracks that are in demand. we can also show the exact requests count in UI, maybe next to the title or in a tooltip. this can create a sense of community and demand for certain tracks, and help us prioritize which tracks to process first.

function sanitizePrefixPart(value) {
  return String(value || "tracks").replace(/^\/+|\/+$/g, "");
}

export async function GET(request) {
  let requestsCount = 0;
  let requestsArray = [];
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

    // Fetch requests.json for this videoId (after all vars are set)
    try {
      const requestsKey = `tracks/${videoId}/requests.json`;
      const requestsUrl = `${apiBase}/api/s3/object/${requestsKey}`;
      const requestsHeaders = { Accept: "application/json" };
      if (bearer) requestsHeaders.Authorization = `Bearer ${bearer}`;
      const reqRes = await fetch(requestsUrl, { headers: requestsHeaders, cache: "no-store" });
      if (reqRes.ok) {
        const arr = await reqRes.json();
        if (Array.isArray(arr)) {
          requestsCount = arr.length;
          requestsArray = arr.map(r => ({
            fromPhone: r.requestFromPhone || r.fromPhone || null,
            created: r.created || r.time || null
          }));
        }
      } else {
        requestsArray = [{ error: `requests.json fetch failed: ${reqRes.status} ${reqRes.statusText}` }];
      }
    } catch (e) {
      requestsArray = [{ error: e instanceof Error ? e.message : String(e) }];
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
    const metaKey = `${prefix}meta.json`;

    const hasKaraoke = contents.some((item) => String(item?.Key || "") === karaokeKey);
    const hasVocals = contents.some((item) => String(item?.Key || "") === vocalsKey);
    const hasMeta = contents.some((item) => String(item?.Key || "") === metaKey);

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


    // Always try to fetch meta.json from S3 endpoint for title and duration
    let meta = null;
    let metaInfo = null;
    let hasRequests = false;
    let title = null;
    let duration = null;
    if (videoId) {
      try {
        // S3: Get meta.json for videoId
        const s3MetaUrl = `${apiBase}/api/s3/object/tracks/${encodeURIComponent(videoId)}/meta.json`;
        const s3Headers = { ...headers, Accept: "application/json" };
        const s3Res = await fetch(s3MetaUrl, { headers: s3Headers, cache: "no-store" });
        if (s3Res.ok) {
          meta = await s3Res.json();
          title = meta.title || null;
          duration = meta.duration || null;
          metaInfo = {
            title: meta.title || null,
            artist: meta.artist || null,
            requests: typeof meta.requests === "number" ? meta.requests : null,
          };
          hasRequests = typeof meta.requests === "number" && meta.requests > 0;
        }
      } catch (e) {
        // ignore meta fetch errors
      }
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
      hasMeta,
      hasRequests,
      title,
      duration,
      meta: metaInfo,
      requestsCount,
      requests: requestsArray,
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
