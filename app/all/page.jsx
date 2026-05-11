"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

async function fetchYouTubeMeta(videoId) {
  try {
    const res = await fetch("/api/youtube/get-video-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return { title: data.title || "", duration: data.duration || "" };
  } catch {
    return {};
  }
}

export default function AllTracksPage() {
  // Default language to HE (Hebrew)
  // If you add language logic, use this as the default
  // Example: const [lang, setLang] = useState('he');
  const [folders, setFolders] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    async function fetchFolders() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/s3/list?prefix=tracks", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed to fetch S3 folders");
        const data = await res.json();
        const folderSet = new Set();
        (data.objects || []).forEach(obj => {
          const match = obj.Key.match(/^tracks\/([^/]+)\//);
          if (match) folderSet.add(match[1]);
        });
        const vids = Array.from(folderSet);
        setFolders(vids);
        setLoadingMeta(true);
        // Fetch meta for each vidID in parallel
        const metaObj = {};
        await Promise.all(
          vids.map(async (vid) => {
            const m = await fetchYouTubeMeta(vid);
            metaObj[vid] = m;
          })
        );
        setMeta(metaObj);
        setLoadingMeta(false);
      } catch (err) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchFolders();
  }, []);

  return (
    <main className="page-bg" style={{ minHeight: "100vh", padding: 24 }}>
      <section className="card" style={{ maxWidth: 700, margin: "0 auto" }}>
        <h1>All S3 Tracks</h1>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {folders.map((vid) => {
              const m = meta[vid] || {};
              return (
                <li key={vid} style={{ margin: "12px 0" }}>
                  <span style={{ fontWeight: 600 }}>{vid}</span>
                  {m.title && (
                    <span style={{ marginLeft: 8, color: '#888' }}>
                      {m.title} {m.duration ? `/ ${m.duration}` : ''}
                    </span>
                  )}
                  <Link
                    href={`/after-payment?videoId=${encodeURIComponent(vid)}${m.title ? `&title=${encodeURIComponent(m.title)}` : ''}${m.duration ? `&duration=${encodeURIComponent(m.duration)}` : ''}`}
                    legacyBehavior
                  >
                    <a style={{ marginLeft: 12, color: "#0070f3" }}>Go to After-Payment</a>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {loadingMeta && <p>Loading titles...</p>}
      </section>
    </main>
  );
}
