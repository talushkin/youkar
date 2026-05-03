"use client";

import { useEffect, useState } from "react";

export default function AfterPaymentClient({ videoId }) {
  const [status, setStatus] = useState({
    type: "idle",
    message: "Checking karaoke processing status...",
  });
  const [links, setLinks] = useState([]);

  useEffect(() => {
    if (!videoId) {
      setStatus({
        type: "error",
        message: "Missing videoId in return URL. Start again from the home page.",
      });
      return;
    }

    let stopped = false;
    let timer = null;

    const check = async () => {
      try {
        const response = await fetch(`/api/cdn-links?videoId=${encodeURIComponent(videoId)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load CDN links");
        }

        const receivedLinks = Array.isArray(data.links) ? data.links : [];
        if (receivedLinks.length > 0) {
          setLinks(receivedLinks);
          setStatus({ type: "success", message: "CDN files are ready." });
          return;
        }

        setStatus({
          type: "pending",
          message: "Payment confirmed. Processing still running, retrying...",
        });

        if (!stopped) {
          timer = window.setTimeout(check, 7000);
        }
      } catch (err) {
        setStatus({
          type: "error",
          message: err.message || "Could not fetch status",
        });
      }
    };

    check();

    return () => {
      stopped = true;
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [videoId]);

  return (
    <main className="page-bg">
      <section className="card">
        <h1>Payment Complete</h1>
        <p className="lead">Video ID: {videoId || "N/A"}</p>

        <p className={`result ${status.type === "pending" ? "success" : status.type}`}>
          {status.message}
        </p>

        {links.length > 0 ? (
          <div className="links-list">
            <h2>Download Links</h2>
            {links.map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                {item.label}
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
