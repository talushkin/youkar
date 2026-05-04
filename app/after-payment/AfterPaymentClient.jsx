"use client";

import { useEffect, useRef, useState } from "react";

const CDN_BASE = "https://d23du7ibe4a1ni.cloudfront.net";

const copy = {
  he: {
    paymentConfirmed: "התשלום אושר! מכינים את קבצי הקריוקי שלך...",
    paymentFailedPrefix: "התשלום נכשל:",
    missingVideoId: "חסר מזהה וידאו. חזרו לעמוד הבית ונסו שוב.",
    failedFileStatus: "שגיאה בבדיקת סטטוס הקבצים",
    filesReady: "הקבצים שלך מוכנים!",
    waTitle: "קבצי הקריוקי שלך",
    waText: {
      ready: "הקבצים שלך מוכנים!",
      karaoke: "קריוקי (ללא ווקאל)",
      vocals: "ווקאל בלבד",
      original: "השיר המקורי",
    },
    stillProcessing: "עדיין בעיבוד... הדף יתעדכן אוטומטית.",
    verifyFailedFallback: "לא ניתן לאמת את מצב הקבצים. הקישורים מוצגים בכל זאת.",
    paymentFailedTitle: "התשלום נכשל",
    returnToPayment: "חזרה לתשלום",
    thankYouTitle: "תודה על הרכישה!",
    lead: "קבצי הקריוקי והווקאל שלך מוכנים כאן למטה.",
    songPreviewTitle: "תצוגת שיר",
    processingIndicator: "מכינים את קבצי ה-CDN שלך... בדיקה כל 5 שניות.",
    yourFiles: "הקבצים שלך",
    karaokeLabel: "קריוקי (ללא ווקאל)",
    vocalsLabel: "ווקאל בלבד",
    download: "הורדה",
    createAnother: "יצירת קריוקי נוסף",
  },
  en: {
    paymentConfirmed: "Payment confirmed! Preparing your karaoke files...",
    paymentFailedPrefix: "Payment failed:",
    missingVideoId: "Missing video ID. Please return to the home page and try again.",
    failedFileStatus: "Failed to check file status",
    filesReady: "Your files are ready!",
    waTitle: "Your Karaoke Files",
    waText: {
      ready: "Your Karaoke & Vocals files are ready!",
      karaoke: "Karaoke (no vocals)",
      vocals: "Vocals only",
      original: "Original song",
    },
    stillProcessing: "Still processing... we'll update this page automatically.",
    verifyFailedFallback: "Could not verify file status. Links are shown below anyway.",
    paymentFailedTitle: "Payment Failed",
    returnToPayment: "Return to Payment",
    thankYouTitle: "Thank You for Your Purchase!",
    lead: "Your karaoke & vocals files are being prepared below.",
    songPreviewTitle: "Song preview",
    processingIndicator: "Preparing your CDN files... checking every 5 seconds.",
    yourFiles: "Your Files",
    karaokeLabel: "Karaoke (no vocals)",
    vocalsLabel: "Vocals only",
    download: "Download",
    createAnother: "Create another karaoke",
  },
};

export default function AfterPaymentClient({ videoId, errorDescription, phone }) {
  const [lang, setLang] = useState("he");
  const ui = copy[lang] || copy.en;
  const [status, setStatus] = useState({
    type: "pending",
    message: copy.he.paymentConfirmed,
  });
  const [karaokeUrl, setKaraokeUrl] = useState("");
  const [vocalsUrl, setVocalsUrl] = useState("");
  const waSentRef = useRef(false);

  const isPaymentError = errorDescription && errorDescription !== "SUCCESS";

  useEffect(() => {
    if (isPaymentError) {
      setStatus({
        type: "error",
        message: `${ui.paymentFailedPrefix} ${errorDescription}`,
      });
      return;
    }

    if (!videoId) {
      setStatus({
        type: "error",
        message: ui.missingVideoId,
      });
      return;
    }

    // Optimistically keep the known CDN pattern as fallback values.
    const kar = `${CDN_BASE}/${videoId}/karaoke.mp3`;
    const voc = `${CDN_BASE}/${videoId}/vocals.mp3`;
    setKaraokeUrl(kar);
    setVocalsUrl(voc);

    let stopped = false;
    let timer = null;

    const check = async () => {
      try {
        const response = await fetch(`/api/cdn-links?videoId=${encodeURIComponent(videoId)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || ui.failedFileStatus);
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
            setStatus({ type: "success", message: `${ui.filesReady} 🎤` });

            // Send WA notification once (only if phone available)
            if (phone && !waSentRef.current) {
              waSentRef.current = true;
              const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
              const waText =
                `🎤 ${ui.waText.ready}\n\n` +
                `🎵 ${ui.waText.karaoke}:\n${karLink}\n\n` +
                `🎙️ ${ui.waText.vocals}:\n${vocLink}\n\n` +
                `▶️ ${ui.waText.original}:\n${ytUrl}`;
              fetch("/api/wa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: phone, text: waText, title: ui.waTitle }),
              }).catch(() => {});
            }
            return;
          }
        }

        if (!stopped) {
          setStatus({
            type: "pending",
            message: ui.stillProcessing,
          });
          timer = window.setTimeout(check, 5000);
        }
      } catch (err) {
        if (!stopped) {
          setStatus({
            type: "error",
            message: err.message || ui.verifyFailedFallback,
          });
        }
      }
    };

    check();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [videoId, isPaymentError, phone, ui]);

  const ytEmbedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
    : "";
  const isPending = status.type === "pending";

  if (isPaymentError) {
    return (
      <main className="page-bg" dir={lang === "he" ? "rtl" : "ltr"}>
        <section className={`card after-payment-card ${lang === "he" ? "lang-he" : "lang-en"}`}>
          <div className="lang-switch" role="group" aria-label="Language selector">
            <button
              type="button"
              className={`lang-btn ${lang === "he" ? "is-active" : ""}`}
              onClick={() => setLang("he")}
            >
              HE
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === "en" ? "is-active" : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
          <h1 className="error-title">❌ {ui.paymentFailedTitle}</h1>
          <p className={`result error`}>{errorDescription}</p>
          <a href="/" className="back-payment-btn">
            {lang === "he" ? "→" : "←"} {ui.returnToPayment}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bg" dir={lang === "he" ? "rtl" : "ltr"}>
      <section className={`card after-payment-card ${lang === "he" ? "lang-he" : "lang-en"}`}>
        <div className="lang-switch" role="group" aria-label="Language selector">
          <button
            type="button"
            className={`lang-btn ${lang === "he" ? "is-active" : ""}`}
            onClick={() => setLang("he")}
          >
            HE
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === "en" ? "is-active" : ""}`}
            onClick={() => setLang("en")}
          >
            EN
          </button>
        </div>
        <h1 className="thank-you-title">🎉 {ui.thankYouTitle}</h1>
        <p className="lead">{ui.lead}</p>

        {videoId && (
          <div className="yt-embed-wrap">
            <iframe
              src={ytEmbedUrl}
              title={ui.songPreviewTitle}
              className="yt-embed-iframe"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <p className={`result ${status.type === "pending" ? "info" : status.type}`}>
          {status.message}
        </p>

        {isPending && (
          <div className="processing-indicator" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>{ui.processingIndicator}</span>
          </div>
        )}

        {!isPending && (
          <div className="download-links">
            <h2>{ui.yourFiles}</h2>

            <div className="download-row">
              <span className="download-label">🎵 {ui.karaokeLabel}</span>
              <div className="download-actions">
                {karaokeUrl && (
                  <>
                    <audio
                      controls
                      src={karaokeUrl}
                      className="inline-audio"
                      preload="none"
                    />
                    <a
                      href={karaokeUrl}
                      download
                      className="download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ui.download}
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="download-row">
              <span className="download-label">🎤 {ui.vocalsLabel}</span>
              <div className="download-actions">
                {vocalsUrl && (
                  <>
                    <audio
                      controls
                      src={vocalsUrl}
                      className="inline-audio"
                      preload="none"
                    />
                    <a
                      href={vocalsUrl}
                      download
                      className="download-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {ui.download}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <a href="/" className="back-home-btn">{lang === "he" ? "→" : "←"} {ui.createAnother}</a>
      </section>
    </main>
  );
}
