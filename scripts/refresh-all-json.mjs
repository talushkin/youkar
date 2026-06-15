/**
 * Refreshes app/all/all.json from the S3 list endpoint.
 * Also cross-checks each videoId against CDN pending.json and logs status.
 *
 * Usage:
 *   node scripts/refresh-all-json.mjs
 *   # or via npm:
 *   npm run refresh-all
 *
 * Env overrides (optional):
 *   BACKEND_BASE_URL  – defaults to https://be-tan-theta.vercel.app
 *   API_BEARER        – defaults to 1234
 *   CDN_BASE_URL      – defaults to https://d23du7ibe4a1ni.cloudfront.net
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BE_BASE = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
const BEARER = process.env.API_BEARER || "1234";
const CDN_BASE = (process.env.CDN_BASE_URL || "https://d23du7ibe4a1ni.cloudfront.net").replace(/\/+$/, "");
const OUT_PATH = join(__dirname, "../app/all/all.json");

function extractVideoId(key) {
  const m = key.match(/^tracks\/([^/]+)\//);
  return m ? m[1] : null;
}

async function main() {
  // 1 — Fetch S3 list
  const s3Url = `${BE_BASE}/api/s3/list?prefix=tracks`;
  console.log(`\nFetching S3 list: ${s3Url}`);
  const s3Res = await fetch(s3Url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${BEARER}` },
  });
  if (!s3Res.ok) {
    throw new Error(`S3 list fetch failed: ${s3Res.status} ${s3Res.statusText}`);
  }
  const s3Data = await s3Res.json();

  // 2 — Fetch CDN pending.json
  const pendingUrl = `${CDN_BASE}/pending.json`;
  console.log(`Fetching pending.json: ${pendingUrl}`);
  let pendingIds = new Set();
  try {
    const pendingRes = await fetch(pendingUrl, { cache: "no-store" });
    if (pendingRes.ok) {
      const pendingArray = await pendingRes.json();
      if (Array.isArray(pendingArray)) {
        pendingArray.forEach((item) => {
          if (item?.videoId) pendingIds.add(item.videoId);
        });
      }
    } else {
      console.warn(`  pending.json fetch returned ${pendingRes.status} — skipping cross-check`);
    }
  } catch (e) {
    console.warn(`  pending.json fetch error: ${e.message} — skipping cross-check`);
  }

  // 3 — Derive unique videoIds from S3 contents and log pending status
  const contents = Array.isArray(s3Data?.contents)
    ? s3Data.contents
    : Array.isArray(s3Data?.objects)
      ? s3Data.objects
      : Array.isArray(s3Data)
        ? s3Data
        : [];

  const videoIds = [...new Set(contents.map((o) => extractVideoId(o.Key || o.key || "")).filter(Boolean))];
  console.log(`\nFound ${contents.length} S3 objects across ${videoIds.length} videoIds\n`);

  let inPending = 0;
  let notInPending = 0;
  for (const vid of videoIds) {
    const inQueue = pendingIds.has(vid);
    if (inQueue) inPending++;
    else notInPending++;
    console.log(`  ${inQueue ? "✅ pending" : "❌ not-pending"}  ${vid}`);
  }

  console.log(`\nSummary: ${inPending} in pending queue, ${notInPending} not in pending queue`);

  // 4 — Write fresh all.json
  const output = {
    success: true,
    contents,
  };
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ Written ${contents.length} entries to ${OUT_PATH}\n`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message || err);
  process.exit(1);
});
