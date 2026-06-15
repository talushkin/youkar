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

function normalizeLang(value) {
  const raw = String(value || "").trim().toUpperCase();
  return raw === "HE" ? "HE" : "EN";
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function formatE164Phone(value) {
  const normalized = normalizePhone(value);
  return normalized ? `+${normalized}` : null;
}

const apiBase = () => process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
const PENDING_CDN_URL = "https://d23du7ibe4a1ni.cloudfront.net/pending.json";

function parseDurationToSeconds(rawDuration) {
  if (rawDuration === null || rawDuration === undefined) return null;

  if (typeof rawDuration === "number") {
    return Number.isFinite(rawDuration) && rawDuration > 0 ? Math.floor(rawDuration) : null;
  }

  const text = String(rawDuration).trim();
  if (!text) return null;

  if (/^\d+$/.test(text)) {
    const value = Number(text);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : null;
  }

  const parts = text.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return Math.floor(minutes * 60 + seconds);
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return Math.floor(hours * 3600 + minutes * 60 + seconds);
  }

  return null;
}

async function fetchDurationSecondsFromBackend(videoId) {
  if (!videoId) return null;

  const url = `${apiBase()}/api/youtube/get-video-data`;
  const authToken = process.env.YOUTUBE_API_BEARER || process.env.API_BEARER || "1234";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ videoId }),
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  return parseDurationToSeconds(data?.duration);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isMetaMatch(expectedMeta, actualMeta) {
  if (!hasObject(expectedMeta) || !hasObject(actualMeta)) return false;
  const expectedEntries = Object.entries(expectedMeta);
  if (expectedEntries.length === 0) return false;

  return expectedEntries.every(([key, value]) => {
    if (value === null || value === undefined || value === "") return true;
    const actualValue = actualMeta[key];
    return String(actualValue ?? "") === String(value);
  });
}

async function verifyEntriesInCdn(entries, attempts = 5) {
  const expected = entries
    .filter((entry) => entry?.videoId)
    .map((entry) => ({ videoId: String(entry.videoId), meta: entry.meta || {} }));

  if (expected.length === 0) {
    return { ok: false, attempts: 0, pending: [], matchedByVideoId: {}, matchedByMeta: {} };
  }

  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(`${PENDING_CDN_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      if (i < attempts - 1) await delay(300 * (i + 1));
      continue;
    }

    const parsed = await response.json().catch(() => null);
    const pending = Array.isArray(parsed) ? parsed : [];
    const matchedByVideoId = {};
    const matchedByMeta = {};

    for (const candidate of expected) {
      const sameVideo = pending.find((item) => String(item?.videoId || "") === candidate.videoId);
      matchedByVideoId[candidate.videoId] = sameVideo || null;
      matchedByMeta[candidate.videoId] = isMetaMatch(candidate.meta, sameVideo?.meta) ? sameVideo : null;
    }

    const allMetaMatched = expected.every((candidate) => Boolean(matchedByMeta[candidate.videoId]));
    if (allMetaMatched) {
      return {
        ok: true,
        attempts: i + 1,
        pending,
        matchedByVideoId,
        matchedByMeta,
      };
    }

    if (i < attempts - 1) {
      await delay(300 * (i + 1));
    }
  }

  return { ok: false, attempts, pending: [], matchedByVideoId: {}, matchedByMeta: {} };
}

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

    const filteredPending = videoId
      ? pending.filter((item) => String(item?.videoId || "") === videoId)
      : pending;

    return NextResponse.json({
      ok: true,
      pending: filteredPending,
      count: filteredPending.length,
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
    const durationCache = new Map();

    const normalizedEntries = (await Promise.all(incomingItems
      .filter((item) => item && typeof item === "object")
      .map(async (incoming) => {
        const videoId = incoming?.videoId;
        if (!videoId) return null;

        let backendDurationSeconds = null;
        if (durationCache.has(videoId)) {
          backendDurationSeconds = durationCache.get(videoId);
        } else {
          backendDurationSeconds = await fetchDurationSecondsFromBackend(videoId).catch(() => null);
          durationCache.set(videoId, backendDurationSeconds);
        }

        const incomingMeta = incoming?.meta || {};
        const userLang = normalizeLang(incoming?.userLang || incomingMeta?.userLang || incoming?.lang || incomingMeta?.lang);
        const lang = normalizeLang(incoming?.lang || incomingMeta?.lang || userLang);
        const phone = normalizePhone(incoming?.phone || incomingMeta?.phone || incomingMeta?.fromPhone || incoming?.fromPhone);
        const fromPhone = formatE164Phone(incomingMeta?.fromPhone || incoming?.fromPhone || phone);
        const rawKeyShift = incomingMeta?.keyShift ?? incomingMeta?.shiftKey ?? incoming?.keyShift ?? incoming?.shiftKey ?? null;
        const parsedKeyShift = rawKeyShift === null || rawKeyShift === "" ? null : Number(rawKeyShift);
        const keyShift = Number.isFinite(parsedKeyShift) ? parsedKeyShift : null;
        const fallbackIncomingDuration = parseDurationToSeconds(incoming?.duration);
        const durationSeconds = backendDurationSeconds ?? fallbackIncomingDuration ?? 180;

        return {
          videoId,
          link: incoming?.link || `https://www.youtube.com/watch?v=${videoId}`,
          title: incoming?.title || `YouTube ${videoId}`,
          percent: incoming?.percent ?? "",
          created: incoming?.created || nowAsCreatedString(),
          completed: incoming?.completed ?? null,
          startedStems: incoming?.startedStems ?? null,
          finishStems: incoming?.finishStems ?? null,
          duration: String(durationSeconds),
          voc: incoming?.voc ?? null,
          kar: incoming?.kar ?? null,
          fromPhone,
          keyShift,
          shiftKey: keyShift,
          meta: {
            playlistId: incomingMeta.playlistId ?? null,
            playlistName: incomingMeta.playlistName ?? null,
            source: incomingMeta.source || "spotit-FE",
            kind: incomingMeta.kind || "karaoke-missing",
            fromPhone,
            userLang,
            keyShift,
            shiftKey: keyShift,
            lang,
            phone,
          },
          userLang,
          lang,
          phone,
        };
      })
      )).filter(Boolean);

    if (normalizedEntries.length === 0) {
      return NextResponse.json(
        { error: "videoId is required in at least one item" },
        { status: 400 }
      );
    }

    const firstEntry = normalizedEntries[0] || {};
    const wishTitle = String(firstEntry?.title || (firstEntry?.videoId ? `YouTube ${firstEntry.videoId}` : "Request"));
    const wishShift = firstEntry?.shiftKey ?? firstEntry?.keyShift ?? firstEntry?.meta?.shiftKey ?? firstEntry?.meta?.keyShift ?? 0;
    const successWish = `${wishTitle} - added successfully with key shift of ${wishShift}`;
    const failWish = `could not add ${wishTitle} ${wishShift}`;

    const backendUrl = `${apiBase()}/api/pending`;
    const backendHeaders = getBackendHeaders();
    const backendPayload = normalizedEntries;

    // Log the backend call and payload for debugging
    console.log("[api/pending][POST] Calling backend to add pending", {
      url: backendUrl,
      headers: backendHeaders,
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
          wish: failWish,
        },
        { status: 502 }
      );
    }

    const result = await response.json();
    const resultObj = result && typeof result === "object" && !Array.isArray(result) ? result : { result };
    const addedCountRaw = Number(resultObj?.added);
    const hasAddedField = Object.prototype.hasOwnProperty.call(resultObj, "added");
    const wasAdded = hasAddedField ? Number.isFinite(addedCountRaw) && addedCountRaw > 0 : true;
    const verification = await verifyEntriesInCdn(normalizedEntries);
    const firstVideoId = String(firstEntry?.videoId || "");
    const matchedEntry = firstVideoId ? (verification.matchedByMeta?.[firstVideoId] || verification.matchedByVideoId?.[firstVideoId] || null) : null;
    const metaVerified = firstVideoId ? Boolean(verification.matchedByMeta?.[firstVideoId]) : false;
    const wish = wasAdded && metaVerified ? successWish : failWish;

    const clipboardText = [
      "pending.json meta verified",
      `videoId: ${firstVideoId || ""}`,
      `title: ${String(firstEntry?.title || "")}`,
      `shift: ${String(firstEntry?.shiftKey ?? firstEntry?.keyShift ?? "")}`,
      `phone: ${String(firstEntry?.meta?.fromPhone || firstEntry?.fromPhone || "")}`,
      `pendingUrl: ${PENDING_CDN_URL}`,
      `meta: ${JSON.stringify(matchedEntry?.meta || firstEntry?.meta || {}, null, 2)}`,
    ].join("\n");

    console.log("[api/pending][POST] Backend success", {
      url: backendUrl,
      status: response.status,
      result: resultObj,
      cdnMetaVerified: metaVerified,
      cdnAttempts: verification.attempts,
      wish,
    });

    if (!metaVerified) {
      return NextResponse.json(
        {
          ok: false,
          error: "Meta not found in CloudFront pending.json after queue write",
          details: "pending.json did not contain the expected meta for the queued videoId",
          wish: failWish,
          videoId: firstVideoId,
          cloudfrontPendingUrl: PENDING_CDN_URL,
          cloudfrontMetaVerified: false,
          cloudfrontAttempts: verification.attempts,
        },
        { status: 502 }
      );
    }

    // Mirror backend response shape so FE/internal tooling gets identical format.
    return NextResponse.json({
      ...resultObj,
      wish,
      videoId: firstVideoId || resultObj?.videoId || null,
      cloudfrontPendingUrl: PENDING_CDN_URL,
      cloudfrontMetaVerified: metaVerified,
      cloudfrontAttempts: verification.attempts,
      cloudfrontMatchedEntry: matchedEntry,
      clipboardText,
    }, { status: response.status });
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
