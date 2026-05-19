"use client";

import { useEffect, useState, useMemo } from "react";
import allJson from "./all.json";
import TrackBox from "./TrackBox";
import { fetchRequestsData } from "./requests-fetch";

const PAGE_SIZE = 50; // 5x10 תוצאות בעמוד

export default function AllTracksPage() {
  // סינון meta.json מקומי כברירת מחדל
  const localMetaFiles = (allJson.contents || []).filter(obj => obj.Key && obj.Key.endsWith("/meta.json"));
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  // useEffect(() => {
  //   async function fetchTracks() {
  //     setLoading(true);
  //     setError("");
  //     const start = Date.now();
  //     let localTracks = await Promise.all(
  //       localMetaFiles.map(async (obj) => {
  //         const match = obj.Key.match(/^tracks\/([^/]+)\/meta\.json$/);
  //         const videoId = match ? match[1] : null;
  //         let meta = {};
  //         if (videoId) {
  //           try {
  //             const metaRes = await fetch(`/api/s3/object/tracks/${videoId}/meta.json`, { headers: { Accept: "application/json", Authorization: "Bearer 1234" } });
  //             if (metaRes.ok) meta = await metaRes.json();
  //           } catch {}
  //         }
  //         const folder = obj.Key.replace(/\/meta\.json$/, "");
  //         const hasKar = !!(allJson.contents || []).find(o => o.Key === `${folder}/karaoke.mp3`);
  //         const hasVoc = !!(allJson.contents || []).find(o => o.Key === `${folder}/vocals.mp3`);
  //         return {
  //           ...meta,
  //           folder,
  //           hasKar,
  //           hasVoc,
  //           requests: meta.requests || 0,
  //           title: meta.title || "",
  //           artist: meta.uploader || "",
  //         };
  //       })
  //     );
  //     setTracks(localTracks);
  //     try {
  //       const res = await fetch("/api/s3/list?prefix=tracks", { headers: { Accept: "application/json", Authorization: "Bearer 1234" } });
  //       if (!res.ok) throw new Error("API fetch failed");
  //       const data = await res.json();
  //       const metaFiles = data.objects.filter(obj => obj.Key.endsWith("/meta.json"));
  //       const allTracks = await Promise.all(
  //         metaFiles.map(async (obj) => {
  //           const match = obj.Key.match(/^tracks\/([^/]+)\/meta\.json$/);
  //           const videoId = match ? match[1] : null;
  //           let meta = {};
  //           if (videoId) {
  //             const metaRes = await fetch(`/api/s3/object/tracks/${videoId}/meta.json`, { headers: { Accept: "application/json", Authorization: "Bearer 1234" } });
  //             if (metaRes.ok) meta = await metaRes.json();
  //           }
  //           const folder = obj.Key.replace(/\/meta\.json$/, "");
  //           const kar = data.objects.find(o => o.Key === `${folder}/karaoke.mp3`);
  //           const voc = data.objects.find(o => o.Key === `${folder}/vocals.mp3`);
  //           return {
  //             ...meta,
  //             folder,
  //             hasKar: !!kar,
  //             hasVoc: !!voc,
  //             requests: meta.requests || 0,
  //             title: meta.title || "",
  //             artist: meta.uploader || "",
  //           };
  //         })
  //       );
  //       setTracks(allTracks);
  //     } catch (err) {
  //       setError("שגיאה בשליפת נתונים מהשרת, מוצגת רשימה מקומית בלבד");
  //     }
  //     const elapsed = Date.now() - start;
  //     if (elapsed < 10000) {
  //       await new Promise(r => setTimeout(r, 10000 - elapsed));
  //     }
  //     setLoading(false);
  //   }
  //   fetchTracks();
  // }, []);

  // טען 10 שורות בלבד מתוך הרשימה המקומית (ללא fetch מהשרת)
  useEffect(() => {
    setLoading(true);
    // Prepare placeholder tracks for immediate rendering
    const placeholders = localMetaFiles.slice(0, 50).map(obj => {
      const match = obj.Key.match(/^tracks\/([^/]+)\/meta\.json$/);
      const videoId = match ? match[1] : null;
      const folder = obj.Key.replace(/\/meta\.json$/, "");
      return {
        folder,
        videoId,
        title: "טוען...",
        artist: "",
        duration: null,
        hasKar: false,
        hasVoc: false,
        requests: 0,
        requestsData: [],
        loading: true
      };
    });
    setTracks(placeholders);

    // For each, fetch cdn-links and update as soon as data arrives
    placeholders.forEach((track, idx) => {
      if (!track.videoId) return;
      fetch(`/api/cdn-links?videoId=${track.videoId}`)
        .then(res => res.ok ? res.json() : null)
        .then(apiData => {
          if (!apiData) return;
          setTracks(prev => {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ...apiData.meta,
              hasKar: apiData.files?.karaoke ?? false,
              hasVoc: apiData.files?.vocals ?? false,
              requests: apiData.requestsCount ?? 0,
              requestsData: Array.isArray(apiData.requests) ? apiData.requests : [],
              title: apiData.title || apiData.meta?.title || "",
              artist: apiData.meta?.artist || apiData.meta?.uploader || "",
              duration: apiData.duration || apiData.meta?.duration || null,
              loading: false
            };
            return updated;
          });
        });
    });
    setLoading(false);
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let arr = tracks;
    if (search.length >= 3) {
      const q = search.toLowerCase();
      arr = arr.filter(t =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q))
      );
    }
    arr = arr.sort((a, b) => b.requests - a.requests);
    return arr;
  }, [tracks, search]);

  const total = tracks.length;
  const filteredCount = filtered.length;
  const pageCount = Math.ceil(filteredCount / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const fromIdx = filteredCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const toIdx = Math.min(page * PAGE_SIZE, filteredCount);

  return (
    <div style={{ fontSize: 12, padding: 8 }}>
      <h2 style={{ fontSize: 14, margin: "8px 0" }}>
        כל השירים: {total} | תוצאות מסוננות: {filteredCount}
      </h2>
      <input
        style={{ fontSize: 12, marginBottom: 8, width: 220 }}
        placeholder="חפש לפי שם/אמן (3 אותיות ומעלה)"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
      />
      <div style={{ margin: "8px 0" }}>
        עמוד {page} מתוך {pageCount} | מציג {fromIdx}-{toIdx} מתוך {filteredCount} תוצאות (מקסימום {PAGE_SIZE}x4 בעמוד)
      </div>
      {/* גריד 4 עמודות, כל עמודה עם כל הכותרות */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        columnGap: 4,
        rowGap: 1,
        marginTop: 12,
        width: '90%',
        marginLeft: 'auto',
        marginRight: 'auto'
      }}>
        {paged.length === 0 ? (
          <div style={{ gridColumn: 'span 4', textAlign: 'center' }}>לא נמצאו תוצאות</div>
        ) : (
          Array.from({ length: Math.ceil(paged.length / 5) }).map((_, rowIdx) => (
            <>
              {paged.slice(rowIdx * 5, rowIdx * 5 + 5).map((t, colIdx) => (
                <TrackBox
                  key={t.folder}
                  t={t}
                  ytImgUrl={`https://img.youtube.com/vi/${t.folder.split('/').pop()}/default.jpg`}
                  onTitleClick={() => {
                    // Go to after-payment for this track
                    const videoId = t.folder.split('/').pop();
                    window.location.href = `/after-payment?videoId=${videoId}`;
                  }}
                  onKarClick={() => {
                    const videoId = t.folder.split('/').pop();
                    window.location.href = `/after-payment?videoId=${videoId}&type=kar`;
                  }}
                  onVocClick={() => {
                    const videoId = t.folder.split('/').pop();
                    window.location.href = `/after-payment?videoId=${videoId}&type=voc`;
                  }}
                  // Requests hover logic
                  onRequestsHover={e => {
                    if (!t.requestsData || t.requestsData.length === 0) return;
                    // Sort requests by time descending (recent first)
                    const sorted = [...t.requestsData].sort((a, b) => {
                      const ta = a.created || a.time || 0;
                      const tb = b.created || b.time || 0;
                      return (tb > ta ? 1 : tb < ta ? -1 : 0);
                    });
                    const tooltip = document.createElement('div');
                    tooltip.style.position = 'absolute';
                    tooltip.style.background = '#fff';
                    tooltip.style.border = '1px solid #ccc';
                    tooltip.style.padding = '8px';
                    tooltip.style.fontSize = '12px';
                    tooltip.style.zIndex = 1000;
                    tooltip.innerHTML = `<table><tr><th>#</th><th>Time</th><th>From</th></tr>` +
                      sorted.map((r, i) => {
                        let phone = r.fromPhone || r.requestFromPhone || '';
                        let time = r.created || r.time || '';
                        // Format timestamp if it's a number (epoch seconds or ms)
                        if (typeof time === 'number' && time > 1000000000) {
                          // If in seconds, convert to ms
                          if (time < 1000000000000) time = time * 1000;
                          const d = new Date(time);
                          time = d.toLocaleString('he-IL', { hour12: false });
                        }
                        return `<tr><td>${i + 1}</td><td>${time}</td><td>${phone}</td></tr>`;
                      }).join('') +
                      `</table>`;
                    document.body.appendChild(tooltip);
                    const rect = e.target.getBoundingClientRect();
                    tooltip.style.left = rect.left + 'px';
                    tooltip.style.top = (rect.bottom + 5) + 'px';
                    t.requestsTooltip = tooltip;
                  }}
                  onRequestsLeave={() => {
                    if (t.requestsTooltip) {
                      document.body.removeChild(t.requestsTooltip);
                      t.requestsTooltip = null;
                    }
                  }}
                />
              ))}
              {/* אם פחות מ-5 בעמודה האחרונה, להשלים ריקים */}
              {rowIdx === Math.ceil(paged.length / 5) - 1 && paged.length % 5 !== 0 &&
                Array.from({ length: 5 - (paged.length % 5) }).map((_, i) => (
                  <div key={"empty-" + i}></div>
                ))}
            </>
          ))
        )}
      </div>
      <div style={{ margin: "8px 0", display: "flex", gap: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>הקודם</button>
        <button disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>הבא</button>
      </div>
    </div>
  );
}
