"use client";

import { useEffect, useRef, useState } from "react";

const CDN_BASE = "https://d23du7ibe4a1ni.cloudfront.net";

const copy = {
  he: {
    dir: "rtl",
    thankYou: "🎉 תודה על הרכישה!",
    lead: "קבצי הקריוקי והווקאל שלך מוכנים בקרוב.",
    pendingInit: "התשלום אושר! מכין את קבצי הקריוקי שלך…",
    pendingPoll: "עדיין מעבד… הדף יתעדכן אוטומטית.",
    ready: "הקבצים שלך מוכנים! 🎤",
    preparingCdn: "מכין קבצים… בדיקה כל 5 שניות.",
    yourFiles: "הקבצים שלך",
    karaokeLabel: "🎵 קריוקי (ללא ווקאל)",
    vocalsLabel: "🎤 ווקאל בלבד",
    download: "הורד",
    backHome: "← צור קריוקי נוסף",
    paymentFailed: "❌ התשלום נכשל",
    returnToPayment: "← חזור לתשלום",
    missingVideoId: "חסר מזהה וידאו. אנא חזור לדף הבית ונסה שוב.",
    songPreview: "תצוגת שיר",
    ready: "הקבצים שלך מוכנים! 🎤",
    errorFallback: "לא ניתן לאמת את סטטוס הקובץ. הקישורים מוצגים בכל מקרה.",
  },
  en: {
    dir: "ltr",
    thankYou: "🎉 Thank You for Your Purchase!",
    lead: "Your karaoke & vocals files are being prepared below.",
    pendingInit: "Payment confirmed! Preparing your karaoke files…",
    pendingPoll: "Still processing… we'll update this page automatically.",
    ready: "Your files are ready! 🎤",
    preparingCdn: "Preparing your CDN files… checking every 5 seconds.",
    yourFiles: "Your Files",
    karaokeLabel: "🎵 Karaoke (no vocals)",
    vocalsLabel: "🎤 Vocals only",
    download: "Download",
    backHome: "← Create another karaoke",
    paymentFailed: "❌ Payment Failed",
    returnToPayment: "← Return to Payment",
    missingVideoId: "Missing video ID. Please return to the home page and try again.",
    songPreview: "Song preview",
    errorFallback: "Could not verify file status. Links are shown below anyway.",
  },
};

function parseShiftValue(rawShift) {
  const parsed = Number(rawShift);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getShiftSuffix(rawShift) {
  const parsedShift = parseShiftValue(rawShift);
  if (!parsedShift) return "";
  const abs = Math.abs(parsedShift);
  const nn = String(abs * 10).replace(/\.0$/, "");
  return parsedShift > 0 ? `{#${nn}` : `{_${nn}`;
}

function buildTrackUrl(videoId, kind, rawShift) {
  return `${CDN_BASE}/${videoId}/${kind}${getShiftSuffix(rawShift)}.mp3`;
}

function normalizePhoneToWa(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function findShiftEntry(versions, rawShift) {
  if (!versions || !Array.isArray(versions.shifts)) return null;
  const parsed = parseShiftValue(rawShift);
  if (!parsed) return null;

  const expectedSuffix = getShiftSuffix(parsed);
  const expectedLabel = parsed > 0 ? `+${parsed}` : `${parsed}`;

  return versions.shifts.find((s) => {
    const sameNumeric = Number.isFinite(Number(s?.shift)) && Math.abs(Number(s.shift) - parsed) < 0.00001;
    return s?.suffix === expectedSuffix || String(s?.label) === expectedLabel || sameNumeric;
  }) || null;
}

export default function AfterPaymentClient({ videoId, errorDescription, phone, title, artist = "", lang: initialLang, shift }) {
  // Always prefer the lang prop from searchParams (from URL)
  const lang = initialLang === "en" ? "en" : "he";
  // Defensive: force all UI strings to Hebrew if lang is he
  const ui = lang === "he" ? copy.he : copy.en;

  const parsedShift = parseShiftValue(shift);
  const isZeroShift = parsedShift === 0;
  const shiftDisplay = !isZeroShift ? `${parsedShift > 0 ? "+" : ""}${parsedShift}` : null;

  const [status, setStatus] = useState({
    type: "pending",
    message: ui.pendingInit,
  });
  const [karaokeUrl, setKaraokeUrl] = useState("");
  const [vocalsUrl, setVocalsUrl] = useState("");
  const [shiftVersions, setShiftVersions] = useState(null); // { original, shifts }
  const [selectedShift, setSelectedShift] = useState("original");
  const [activeChannel, setActiveChannel] = useState("karaoke");
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncDuration, setSyncDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const waStartSentRef = useRef(false);
  const waReadySentRef = useRef(false);
  const pendingPostedRef = useRef(false);
  const karaokeAudioRef = useRef(null);
  const vocalsAudioRef = useRef(null);
  const isSyncingRef = useRef(false);

  const getAudioPair = (source) => {
    const primary = source === "karaoke" ? karaokeAudioRef.current : vocalsAudioRef.current;
    const secondary = source === "karaoke" ? vocalsAudioRef.current : karaokeAudioRef.current;
    return { primary, secondary };
  };

  const formatClock = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  };

  const syncCurrentTime = (source) => {
    if (isSyncingRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary) return;

    if (Number.isFinite(primary.currentTime)) {
      setSyncSeconds(primary.currentTime);
    }
    if (Number.isFinite(primary.duration) && primary.duration > 0) {
      setSyncDuration(primary.duration);
    }

    if (!secondary) return;

    const drift = Math.abs((secondary.currentTime || 0) - (primary.currentTime || 0));
    if (drift < 0.2) return;

    isSyncingRef.current = true;
    secondary.currentTime = primary.currentTime || 0;
    isSyncingRef.current = false;
  };

  const playSynced = async (source) => {
    if (isSyncingRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary || !secondary) return;
    setActiveChannel(source);

    isSyncingRef.current = true;
    const startAt = primary.currentTime || 0;
    setSyncSeconds(startAt);

    secondary.currentTime = startAt;
    primary.playbackRate = secondary.playbackRate;

    // Start in A/B mode: pressed source audible, the other muted.
    primary.muted = false;
    secondary.muted = true;

    try {
      await Promise.allSettled([primary.play(), secondary.play()]);
      setIsPlaying(true);
    } finally {
      isSyncingRef.current = false;
    }
  };

  const pauseSynced = (source) => {
    if (isSyncingRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary || !secondary) return;

    isSyncingRef.current = true;
    primary.pause();
    secondary.pause();
    isSyncingRef.current = false;
    setIsPlaying(false);
  };

  const seekSynced = (source) => {
    if (isSyncingRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary || !secondary) return;

    isSyncingRef.current = true;
    secondary.currentTime = primary.currentTime || 0;
    isSyncingRef.current = false;
    setSyncSeconds(primary.currentTime || 0);
  };

  const onSyncSeek = (e) => {
    const next = Math.max(0, Number(e.target.value) || 0);
    setSyncSeconds(next);
    if (karaokeAudioRef.current) karaokeAudioRef.current.currentTime = next;
    if (vocalsAudioRef.current) vocalsAudioRef.current.currentTime = next;
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseSynced(activeChannel);
      return;
    }
    playSynced(activeChannel);
  };

  const selectChannel = (source) => {
    setActiveChannel(source);
    if (isPlaying) {
      playSynced(source);
    }
  };

  const isPaymentError = errorDescription && errorDescription !== "SUCCESS";

  useEffect(() => {
    if (isPaymentError) {
      setStatus({
        type: "error",
        message: `Payment failed: ${errorDescription}`,
      });
      return;
    }

    if (!videoId) {
      setStatus({
        type: "error",
        message: "Missing video ID. Please return to the home page and try again.",
      });
      return;
    }

    // Optimistically keep the known CDN pattern as fallback values.
    const kar = buildTrackUrl(videoId, "karaoke", parsedShift);
    const voc = buildTrackUrl(videoId, "vocals", parsedShift);
    setKaraokeUrl(kar);
    setVocalsUrl(voc);
    setShiftVersions(null);
    setSelectedShift("original");

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const normalizePhone = (raw) => {
      const digits = String(raw || "").replace(/\D/g, "");
      if (!digits) return "";
      if (digits.startsWith("972")) return digits;
      if (digits.startsWith("0")) return `972${digits.slice(1)}`;
      return digits;
    };
    const userLangCode = lang === "he" ? "HE" : "EN";
    const normalizedPhone = normalizePhone(phone);
    const normalizedShift = parsedShift || null;

    const queuePendingAfterPayment = async () => {
      if (pendingPostedRef.current) return;
      pendingPostedRef.current = true;

      const payload = [
        {
          videoId,
          link: youtubeUrl,
          title: title || `YouTube ${videoId}`,
          percent: "",
          duration: syncDuration > 0 ? String(Math.floor(syncDuration)) : "N/A",
          voc: null,
          kar: null,
          fromPhone: normalizedPhone ? `+${normalizedPhone}` : null,
          keyShift: normalizedShift,
          shiftKey: normalizedShift,
          meta: {
            playlistId: null,
            playlistName: null,
            source: "spotit-FE",
            kind: "karaoke-missing",
            fromPhone: normalizedPhone ? `+${normalizedPhone}` : null,
            userLang: userLangCode,
            keyShift: normalizedShift,
            shiftKey: normalizedShift,
            lang: userLangCode,
            phone: normalizedPhone || null,
          },
          userLang: userLangCode,
          lang: userLangCode,
          phone: normalizedPhone || null,
        },
      ];

      try {
        alert(`Sending /api/pending payload:\n${JSON.stringify(payload, null, 2)}`);
        await fetch("/api/pending", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // Keep UX non-blocking; CDN polling can still continue.
      }
    };

    queuePendingAfterPayment();

    const sendProcessingStartedWa = async () => {
      if (!normalizedPhone || waStartSentRef.current) return;

      const ytTitle = title || `YouTube ${videoId}`;
      const ytLink = youtubeUrl;

      const waText =
        `✅ Payment successful!\n\n` +
        `🎛️ Playback creation has started.\n` +
        `⏳ Your files will soon be ready.\n` +
        `💬 We will send another WhatsApp message when they are ready with the MP3 playback links.\n\n` +
        `🎵 Title: ${ytTitle}\n` +
        `🔗 YouTube: ${ytLink}`;

      try {
        const waPayload = { to: normalizedPhone, text: waText, title: "Payment Confirmed" };
        console.log("[after-payment][WA start] request", waPayload);

        const waResponse = await fetch("/api/wa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(waPayload),
        });

        const waData = await waResponse.json().catch(() => null);
        console.log("[after-payment][WA start] response", {
          status: waResponse.status,
          body: waData,
        });

        if (waResponse.ok) {
          waStartSentRef.current = true;
        }
      } catch {
        // Ignore WA errors to avoid blocking page progress.
      }
    };

    sendProcessingStartedWa();

    let stopped = false;
    let timer = null;


    const check = async () => {
      try {
        const response = await fetch(`/api/cdn-links?videoId=${encodeURIComponent(videoId)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to check file status");
        }
        // Store all available shift versions for UI
        if (data.shiftVersions) {
          setShiftVersions(data.shiftVersions);
        }

        const hasOriginalPair = Boolean(data?.files?.karaoke) && Boolean(data?.files?.vocals);
        const hasShiftedPair = Array.isArray(data?.shiftVersions?.shifts)
          && data.shiftVersions.shifts.some((s) => s?.karaoke && s?.vocals);

        if (!hasOriginalPair && !hasShiftedPair) {
          if (!stopped) {
            setStatus({
              type: "pending",
              message: lang === "he" ? copy.he.pendingPoll : copy.en.pendingPoll,
            });
            timer = window.setTimeout(check, 5000);
          }
          return;
        }

        // Default to original or first available shift
        let initialShift = "original";
        if (!isZeroShift && data.shiftVersions) {
          const found = findShiftEntry(data.shiftVersions, parsedShift);
          if (found?.suffix) initialShift = found.suffix;
        }
        setSelectedShift(initialShift);

        // Helper to get URLs for a given shift
        const getUrlsForShift = (shiftKey) => {
          if (!data.shiftVersions) return { kar: kar, voc: voc };
          if (shiftKey === "original") {
            return {
              kar: data.shiftVersions.original.karaoke || kar,
              voc: data.shiftVersions.original.vocals || voc,
            };
          }
          const found = data.shiftVersions.shifts.find(s => s.suffix === shiftKey);
          return {
            kar: found?.karaoke || kar,
            voc: found?.vocals || voc,
          };
        };

        // Set URLs for selected shift
        const { kar: karUrl, voc: vocUrl } = getUrlsForShift(initialShift);
        setKaraokeUrl(karUrl);
        setVocalsUrl(vocUrl);
        setStatus({ type: "success", message: lang === "he" ? copy.he.ready : copy.en.ready });

        // Send WA notification once (only if phone available)
        if (normalizedPhone && !waReadySentRef.current) {
          waReadySentRef.current = true;
          const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const titleFromLinks = Array.isArray(data.links)
            ? data.links.find((l) => String(l?.title || "").trim())?.title
            : null;
          const shiftLine = !isZeroShift
            ? `🎹 Shift: ${parsedShift > 0 ? `+${parsedShift}` : parsedShift}\n`
            : "";
          const waText =
            `🎤 Your Karaoke & Vocals files are ready!\n\n` +
            `🎵 Title: ${titleFromLinks || title || `YouTube ${videoId}`}\n` +
            shiftLine +
            `▶️ Original song:\n${ytUrl}\n\n` +
            `🎵 Karaoke (no vocals):\n${karUrl}\n\n` +
            `🎙️ Vocals only:\n${vocUrl}`;
          const waPayload = { to: normalizedPhone, text: waText, title: "Your Karaoke Files" };
          console.log("[after-payment][WA ready] request", waPayload);

          fetch("/api/wa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(waPayload),
          })
            .then(async (res) => {
              const body = await res.json().catch(() => null);
              console.log("[after-payment][WA ready] response", {
                status: res.status,
                body,
              });
            })
            .catch(() => {});
        }
        return;
      } catch (err) {
        if (!stopped) {
          setStatus({
            type: "error",
            message: err.message || "Could not verify file status. Links are shown below anyway.",
          });
        }
      }
    };

    check();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [videoId, isPaymentError, phone, title, lang, shift, syncDuration, parsedShift]);

  const ytEmbedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
    : "";
  const isPending = status.type === "pending";

  if (isPaymentError) {
    return (
      <main className="page-bg" dir={ui.dir}>
        <section className="card after-payment-card" dir={ui.dir}>
          <h1 className="error-title">{ui.paymentFailed}</h1>
          <p className={`result error`}>{errorDescription}</p>
          <a href="/api/create-karaoke" className="back-payment-btn">
            {ui.returnToPayment}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bg" dir={ui.dir}>
      <section className="card after-payment-card" dir={ui.dir}>

        <h1 className="thank-you-title">{ui.thankYou}</h1>
        <p className="lead">{ui.lead}</p>
        {shiftDisplay && (
          <div style={{ display: "flex", justifyContent: "center", margin: "0.5rem 0 1rem" }}>
            <button
              type="button"
              disabled
              aria-label={lang === "he" ? `הסטת סולם ${shiftDisplay}` : `Key shift ${shiftDisplay}`}
              style={{
                border: "1px solid #1f8f4a",
                background: "#e7f8ed",
                color: "#146c35",
                borderRadius: 999,
                padding: "0.35rem 0.9rem",
                fontWeight: 700,
                fontSize: 16,
                opacity: 1,
                cursor: "default",
              }}
            >
              {lang === "he" ? `🎹 הסטת סולם ${shiftDisplay}` : `🎹 Key Shift ${shiftDisplay}`}
            </button>
          </div>
        )}

        {videoId && (
          <div className="yt-embed-wrap">
            <iframe
              src={ytEmbedUrl}
              title="Song preview"
              className="yt-embed-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* WhatsApp share link for user */}
        {phone && videoId && title && (
          <div style={{ margin: '1.5rem 0', textAlign: 'center' }}>
            <a
              href={(() => {
                // Build WhatsApp message with ASCII symbols
                const waPhone = normalizePhoneToWa(phone);
                const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
                let karUrl = buildTrackUrl(videoId, "karaoke", parsedShift);
                let vocUrl = buildTrackUrl(videoId, "vocals", parsedShift);

                // Always prefer URL set for the requested shift from query string when present.
                if (!isZeroShift && shiftVersions) {
                  const requested = findShiftEntry(shiftVersions, parsedShift);
                  if (requested) {
                    karUrl = requested.karaoke || karUrl;
                    vocUrl = requested.vocals || vocUrl;
                  }
                } else if (shiftVersions) {
                  if (selectedShift === "original") {
                    karUrl = shiftVersions.original.karaoke || karUrl;
                    vocUrl = shiftVersions.original.vocals || vocUrl;
                  } else {
                    const found = shiftVersions.shifts.find((s) => s.suffix === selectedShift);
                    if (found) {
                      karUrl = found.karaoke || karUrl;
                      vocUrl = found.vocals || vocUrl;
                    }
                  }
                }
                const shironetUrl = `https://shironet.mako.co.il/search?q=${encodeURIComponent(title)}`;
                const tab4uUrl = `https://www.tab4u.com/resultsSimple?q=${encodeURIComponent(title)}`;
                const afterPaymentUrl = `https://youkar.vercel.app/after-payment?videoId=${videoId}&title=${encodeURIComponent(title)}&shift=${encodeURIComponent(parsedShift)}`;
                const shiftLine = !isZeroShift
                  ? `# הסטת סולם: ${parsedShift > 0 ? `+${parsedShift}` : parsedShift}\n`
                  : "";
                const msg =
                  `*${title}* — ${artist || ''}\n` +
                  `# אורך: ${syncDuration ? formatClock(syncDuration) : ''}\n` +
                  shiftLine +
                  `# מהטלפון: ${waPhone}\n` +
                  `# יוטיוב: ${ytUrl}\n\n` +
                  `- [קריוקי בלבד](${karUrl})\n` +
                  `- [שירה בלבד](${vocUrl})\n` +
                  `- [מילים בשירונט](${shironetUrl})\n` +
                  `- [אקורדים TAB4U](${tab4uUrl})\n` +
                  `- [דף הורדה](${afterPaymentUrl})\n`;
                return `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#25D366', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: 8, fontWeight: 600, fontSize: 18, textDecoration: 'none', marginBottom: 12 }}
            >
              שלח את כל פרטי השיר ב-WhatsApp
            </a>
          </div>
        )}

        {/* Key shift version buttons row */}
        {shiftVersions && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'center', margin: '0.5rem 0 1rem 0' }}>
            <button
              type="button"
              className={selectedShift === "original" ? "shift-btn is-active" : "shift-btn"}
              onClick={() => {
                setSelectedShift("original");
                setKaraokeUrl(shiftVersions.original.karaoke);
                setVocalsUrl(shiftVersions.original.vocals);
              }}
            >
              Original
            </button>
            {shiftVersions.shifts.map((s) => (
              <button
                key={s.suffix}
                type="button"
                className={selectedShift === s.suffix ? "shift-btn is-active" : "shift-btn"}
                onClick={() => {
                  setSelectedShift(s.suffix);
                  setKaraokeUrl(s.karaoke);
                  setVocalsUrl(s.vocals);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="lyrics-links" style={{ display: 'flex', gap: '3rem', justifyContent: 'center', margin: '1.5rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, marginBottom: 4 }}>
              CHORDS / אקורדים לשיר
            </span>
            <a
              href={`https://www.tab4u.com/resultsSimple?q=${encodeURIComponent(title || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Tab4U Chords`}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <img src="/tab4uPclogo.svg" alt="Tab4U" style={{ width: 50, height: 30, objectFit: 'contain', marginRight: 8 }} />
              Tab4U
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, marginBottom: 4 }}>
              LYRICS / מילים לשיר
            </span>
            <a
              href={`https://shironet.mako.co.il/search?q=${encodeURIComponent(title || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`Shironet Lyrics`}
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              <img src="/shironet.gif" alt="Shironet" style={{ width: 50, height: 30, objectFit: 'contain', marginRight: 8 }} />
              Shironet
            </a>
          </div>
        </div>

        <p className={`result ${status.type === "pending" ? "info" : status.type}`}>
          {status.message}
        </p>

        {isPending && (
          <div className="processing-indicator" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>Preparing your CDN files… checking every 5 seconds.</span>
          </div>
        )}

        {!isPending && (
          <div className="download-links">
            <h2>{ui.ready}</h2>

            <div className="sync-controls" dir="ltr">
              <div className="sync-source-icons" role="group" aria-label="Audio channels">
                <button
                  type="button"
                  className={`source-icon-btn karaoke-icon ${activeChannel === "karaoke" ? "is-active" : ""}`}
                  onClick={() => selectChannel("karaoke")}
                  aria-label="Karaoke"
                  title="Karaoke"
                />
                <button
                  type="button"
                  className={`source-icon-btn vocals-icon ${activeChannel === "vocals" ? "is-active" : ""}`}
                  onClick={() => selectChannel("vocals")}
                  aria-label="Vocals"
                  title="Vocals"
                />
              </div>
              <button type="button" className="sync-play-btn" onClick={togglePlayPause}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                className="sync-slider"
                type="range"
                min="0"
                max={Math.max(0, syncDuration)}
                step="0.1"
                value={Math.min(syncSeconds, Math.max(0, syncDuration))}
                onChange={onSyncSeek}
                aria-label="Sync seek"
              />
              <p className="sync-time">{formatClock(syncSeconds)}</p>
            </div>

            <div className="download-row">
              <span className="download-label" aria-hidden="true">🎵</span>
              <div className="download-actions">
                {karaokeUrl && (
                  <>
                    <audio
                      ref={karaokeAudioRef}
                      controls
                      src={karaokeUrl}
                      className="inline-audio"
                      preload="none"
                      onPlay={() => {
                        playSynced("karaoke");
                      }}
                      onPause={() => {
                        pauseSynced("karaoke");
                      }}
                      onSeeking={() => {
                        seekSynced("karaoke");
                      }}
                      onTimeUpdate={() => {
                        syncCurrentTime("karaoke");
                      }}
                      onRateChange={() => {
                        const vocals = vocalsAudioRef.current;
                        if (vocals && karaokeAudioRef.current && !isSyncingRef.current) {
                          vocals.playbackRate = karaokeAudioRef.current.playbackRate;
                        }
                      }}
                      onEnded={() => {
                        pauseSynced("karaoke");
                      }}
                      onLoadedMetadata={() => {
                        const duration = karaokeAudioRef.current?.duration;
                        if (Number.isFinite(duration) && duration > 0) {
                          setSyncDuration(duration);
                        }
                      }}
                    />
                    <a
                      href={karaokeUrl}
                      download
                      className="download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="download-row">
              <span className="download-label" aria-hidden="true">🎤</span>
              <div className="download-actions">
                {vocalsUrl && (
                  <>
                    <audio
                      ref={vocalsAudioRef}
                      controls
                      src={vocalsUrl}
                      className="inline-audio"
                      preload="none"
                      onPlay={() => {
                        playSynced("vocals");
                      }}
                      onPause={() => {
                        pauseSynced("vocals");
                      }}
                      onSeeking={() => {
                        seekSynced("vocals");
                      }}
                      onTimeUpdate={() => {
                        syncCurrentTime("vocals");
                      }}
                      onRateChange={() => {
                        const karaoke = karaokeAudioRef.current;
                        if (karaoke && vocalsAudioRef.current && !isSyncingRef.current) {
                          karaoke.playbackRate = vocalsAudioRef.current.playbackRate;
                        }
                      }}
                      onEnded={() => {
                        pauseSynced("vocals");
                      }}
                      onLoadedMetadata={() => {
                        const duration = vocalsAudioRef.current?.duration;
                        if (Number.isFinite(duration) && duration > 0) {
                          setSyncDuration(duration);
                        }
                      }}
                    />
                    <a
                      href={vocalsUrl}
                      download
                      className="download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <a href="/" target="_top" className="back-home-btn">{ui.backHome}</a>
      </section>
    </main>
  );
}
