"use client";

import { useEffect, useRef, useState } from "react";

const CDN_BASE = "https://d23du7ibe4a1ni.cloudfront.net";

export default function AfterPaymentClient({ videoId, errorDescription, phone }) {
  const [status, setStatus] = useState({
    type: "pending",
    message: "Payment confirmed! Preparing your karaoke files…",
  });
  const [karaokeUrl, setKaraokeUrl] = useState("");
  const [vocalsUrl, setVocalsUrl] = useState("");
  const waSentRef = useRef(false);

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
            setStatus({ type: "success", message: "Your files are ready! 🎤" });

            // Send WA notification once (only if phone available)
            if (phone && !waSentRef.current) {
              waSentRef.current = true;
              const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
              const waText =
                `🎤 Your Karaoke & Vocals files are ready!\n\n` +
                `🎵 Karaoke (no vocals):\n${karLink}\n\n` +
                `🎙️ Vocals only:\n${vocLink}\n\n` +
                `▶️ Original song:\n${ytUrl}`;
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
  }, [videoId, isPaymentError]);

  const ytEmbedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`
    : "";
  const isPending = status.type === "pending";

  if (isPaymentError) {
    return (
      <main className="page-bg" dir="ltr">
        <section className="card after-payment-card">
          <h1 className="error-title">❌ Payment Failed</h1>
          <p className={`result error`}>{errorDescription}</p>
          <a href="/api/create-karaoke" className="back-payment-btn">
            ← Return to Payment
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bg" dir="ltr">
      <section className="card after-payment-card">
        <h1 className="thank-you-title">🎉 Thank You for Your Purchase!</h1>
        <p className="lead">Your karaoke &amp; vocals files are being prepared below.</p>

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
            <h2>Your Files</h2>

            <div className="download-row">
              <span className="download-label">🎵 Karaoke (no vocals)</span>
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
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>

            <div className="download-row">
              <span className="download-label">🎤 Vocals only</span>
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
                      Download
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <a href="/" target="_top" className="back-home-btn">← Create another karaoke</a>
      </section>
    </main>
  );
}
