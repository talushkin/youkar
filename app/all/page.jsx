"use client";

import { useEffect, useState, useMemo } from "react";
import allJson from "./all.json";

const PAGE_SIZE = 10; // מציגים 10 שורות בלבד

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
    (async () => {
      setLoading(true);
      let localTracks = await Promise.all(
        localMetaFiles.slice(0, 10).map(async (obj) => {
          const match = obj.Key.match(/^tracks\/([^/]+)\/meta\.json$/);
          const videoId = match ? match[1] : null;
          let meta = {};
          if (videoId) {
            try {
              const metaRes = await fetch(`/api/s3/object/tracks/${videoId}/meta.json`, { headers: { Accept: "application/json", Authorization: "Bearer 1234" } });
              if (metaRes.ok) meta = await metaRes.json();
            } catch {}
          }
          const folder = obj.Key.replace(/\/meta\.json$/, "");
          const hasKar = !!(allJson.contents || []).find(o => o.Key === `${folder}/karaoke.mp3`);
          const hasVoc = !!(allJson.contents || []).find(o => o.Key === `${folder}/vocals.mp3`);
          return {
            ...meta,
            folder,
            hasKar,
            hasVoc,
            requests: meta.requests || 0,
            title: meta.title || "",
            artist: meta.uploader || "",
          };
        })
      );
      setTracks(localTracks);
      setLoading(false);
    })();
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
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginTop: 12
      }}>
        {loading ? (
          <div style={{ gridColumn: 'span 4', textAlign: 'center' }}>טוען...</div>
        ) : paged.length === 0 ? (
          <div style={{ gridColumn: 'span 4', textAlign: 'center' }}>לא נמצאו תוצאות</div>
        ) : (
          Array.from({ length: Math.ceil(paged.length / 4) }).map((_, rowIdx) => (
            <>
              {paged.slice(rowIdx * 4, rowIdx * 4 + 4).map((t, colIdx) => (
                <div key={t.folder} style={{
                  background: '#fff',
                  color: '#222',
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 110,
                  boxShadow: '0 2px 8px #0001',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  fontSize: 13
                }}>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, cursor: 'pointer', textDecoration: 'underline dotted' }}
                    onClick={() => {
                      const videoId = t.folder.split('/').pop();
                      const uri = `/api/s3/object/tracks/${videoId}/meta.json`;
                      alert(
                        `GET ${uri}\nAccept: application/json\n\n` +
                        JSON.stringify(t, null, 2)
                      );
                    }}
                    title="הצג meta.json המלא"
                  >
                    {t.title || "(ללא כותרת)"}
                  </div>
                  <div style={{ color: '#444', fontSize: 13 }}>{t.artist || "(ללא אמן)"}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>⏱ משך: {t.duration ? t.duration + ' שניות' : '-'}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <span title="KAR">{t.hasKar ? "🎤" : <span style={{ opacity: 0.2 }}>🎤</span>}</span>
                    <span title="VOC">{t.hasVoc ? "👤" : <span style={{ opacity: 0.2 }}>👤</span>}</span>
                    <span title="בקשות" style={{ marginRight: 'auto', color: '#b55', fontWeight: 700 }}>{t.requests}</span>
                  </div>
                </div>
              ))}
              {/* אם פחות מ-4 בעמודה האחרונה, להשלים ריקים */}
              {rowIdx === Math.ceil(paged.length / 4) - 1 && paged.length % 4 !== 0 &&
                Array.from({ length: 4 - (paged.length % 4) }).map((_, i) => (
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
