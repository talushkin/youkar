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

    // Detect all available key shift versions for karaoke and vocals
    // Match files like karaoke.mp3, karaoke#10.mp3, karaoke_10.mp3, vocals#-10.mp3, etc.
    const shiftRegex = /^(karaoke|vocals)([#_])(-?\d+)\.mp3$/i;
    const shiftVersions = { original: { karaoke: null, vocals: null }, shifts: [] };
    // Always add original
    shiftVersions.original.karaoke = hasKaraoke ? `${cdnBase}/${encodeURIComponent(videoId)}/karaoke.mp3` : null;
    shiftVersions.original.vocals = hasVocals ? `${cdnBase}/${encodeURIComponent(videoId)}/vocals.mp3` : null;

    // Find all shifted versions
    for (const item of contents) {
      const key = String(item?.Key || "").replace(prefix, "");
      const match = key.match(shiftRegex);
      if (match) {
        const type = match[1];
        const sep = match[2];
        const shiftRaw = match[3];
        // shiftRaw is e.g. 10, -15, etc. Convert to float (divide by 10)
        const shiftVal = Number(shiftRaw) / 10;
        // For zero shift, keep the canonical original filename without suffix.
        if (!Number.isFinite(shiftVal) || shiftVal === 0) {
          continue;
        }
        // Compose suffix for UI
        const suffix = `${sep}${shiftRaw}`;
        // Compose label: +1, -1.5, etc.
        const label = shiftVal > 0 ? `+${shiftVal}` : `${shiftVal}`;
        // Find or create entry for this shift
        let entry = shiftVersions.shifts.find((s) => s.suffix === suffix);
        if (!entry) {
          entry = { label, suffix, shift: shiftVal, karaoke: null, vocals: null };
          shiftVersions.shifts.push(entry);
        }
        entry[type] = `${cdnBase}/${encodeURIComponent(videoId)}/${type}${suffix}.mp3`;
      }
    }
    // Sort shifts by shift value ascending
    shiftVersions.shifts.sort((a, b) => a.shift - b.shift);

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
      shiftVersions, // <-- all available key shift versions for UI
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
