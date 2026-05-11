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

export default function AfterPaymentClient({ videoId, errorDescription, phone, title, artist = "", lang: initialLang }) {
  // Always prefer the lang prop from searchParams (from URL)
  const lang = initialLang === "en" ? "en" : "he";
  // Defensive: force all UI strings to Hebrew if lang is he
  const ui = lang === "he" ? copy.he : copy.en;

  // artist is now available as a prop for display if needed

  const [status, setStatus] = useState({
    type: "pending",
    message: ui.pendingInit,
  });
  const [karaokeUrl, setKaraokeUrl] = useState("");
  const [vocalsUrl, setVocalsUrl] = useState("");
  const [activeChannel, setActiveChannel] = useState("karaoke");
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncDuration, setSyncDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const waStartSentRef = useRef(false);
  const waReadySentRef = useRef(false);
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
    playSynced(source);
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
    const kar = `${CDN_BASE}/${videoId}/karaoke.mp3`;
    const voc = `${CDN_BASE}/${videoId}/vocals.mp3`;
    setKaraokeUrl(kar);
    setVocalsUrl(voc);

    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const sendProcessingStartedWa = async () => {
      if (!phone || waStartSentRef.current) return;

      let ytTitle = title || `YouTube ${videoId}`;
      let ytLink = youtubeUrl;

      try {
        const pendingResponse = await fetch(`/api/pending?videoId=${encodeURIComponent(videoId)}`);
        const pendingData = await pendingResponse.json();
        if (pendingResponse.ok) {
          const pendingItem = Array.isArray(pendingData?.pending) ? pendingData.pending[0] : null;
          if (pendingItem?.title) {
            ytTitle = String(pendingItem.title);
          }
          if (pendingItem?.link) {
            ytLink = String(pendingItem.link);
          }
        }
      } catch {
        // Keep fallback title/link if pending lookup fails.
      }

      const waText =
        `✅ Payment successful!\n\n` +
        `🎛️ Playback creation has started.\n` +
        `⏳ Your files will soon be ready.\n` +
        `💬 We will send another WhatsApp message when they are ready with the MP3 playback links.\n\n` +
        `🎵 Title: ${ytTitle}\n` +
        `🔗 YouTube: ${ytLink}`;

      try {
        const waResponse = await fetch("/api/wa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: phone, text: waText, title: "Payment Confirmed" }),
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

        const receivedLinks = Array.isArray(data.links) ? data.links : [];
        if (receivedLinks.length > 0) {
          // Override with actual API links if returned
          const karLink = receivedLinks.find((l) => {
            const u = String(l?.url || "").toLowerCase();
            return u.includes("karaoke") || u.includes("kar");
          })?.url || kar;
          const vocLink = receivedLinks.find((l) => {
            const u = String(l?.url || "").toLowerCase();
            return u.includes("vocals") || u.includes("voc");
          })?.url || voc;

          const hasKaraoke = receivedLinks.some((l) => {
            const u = String(l?.url || "").toLowerCase();
            return u.includes("karaoke") || u.includes("kar");
          });
          const hasVocals = receivedLinks.some((l) => {
            const u = String(l?.url || "").toLowerCase();
            return u.includes("vocals") || u.includes("voc");
          });

          if (hasKaraoke && hasVocals) {
            setKaraokeUrl(karLink);
            setVocalsUrl(vocLink);
            setStatus({ type: "success", message: lang === "he" ? copy.he.ready : copy.en.ready });

            // Send WA notification once (only if phone available)
            if (phone && !waReadySentRef.current) {
              waReadySentRef.current = true;
              const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
              const titleFromLinks = receivedLinks.find((l) => String(l?.title || "").trim())?.title;
              const waText =
                `🎤 Your Karaoke & Vocals files are ready!\n\n` +
                `🎵 Title: ${titleFromLinks || title || `YouTube ${videoId}`}\n` +
                `▶️ Original song:\n${ytUrl}\n\n` +
                `🎵 Karaoke (no vocals):\n${karLink}\n\n` +
                `🎙️ Vocals only:\n${vocLink}`;
              fetch("/api/wa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: phone, text: waText, title: "Your Karaoke Files" }),
              }).catch(() => {});
            }
            return;
          }
        }

        if (!stopped) {
          setStatus({
            type: "pending",
            message: "Still processing… we'll update this page automatically.",
          });
          timer = window.setTimeout(check, 5000);
        }
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
  }, [videoId, isPaymentError, phone, title]);

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

        {/* Lyrics Links */}
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
                >
                  🎵
                </button>
                <button
                  type="button"
                  className={`source-icon-btn vocals-icon ${activeChannel === "vocals" ? "is-active" : ""}`}
                  onClick={() => selectChannel("vocals")}
                  aria-label="Vocals"
                  title="Vocals"
                >
                  🎤
                </button>
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
