"use client";

import { useEffect, useMemo, useState } from "react";

export default function LogsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const beBase = useMemo(() => {
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "";
    return envUrl || "https://be-tan-theta.vercel.app";
  }, []);

  const showLogsUrl = `/api/logs?view=show&r=${refreshKey}`;
  const middlewareLogsUrl = `/api/logs?view=ulogs&r=${refreshKey}`;
  const realtimeUrl = `${beBase}/logs-be`;

  return (
    <main style={{ minHeight: "100vh", background: "#071a2e", color: "#eaf2ff", padding: 16 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ marginBottom: 8 }}>Backend Logs</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>
          Reflects BE logs from /show-logs and /ulogs. Real-time page is available via direct link.
        </p>
        <p style={{ marginTop: 0, opacity: 0.75 }}>
          Auto-refresh: every 5 seconds.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{ background: "#0f4c81", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer" }}
          >
            Refresh
          </button>
          <a href={realtimeUrl} target="_blank" rel="noreferrer" style={{ color: "#7ad0ff", alignSelf: "center" }}>
            Open real-time logs (logs-be)
          </a>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <section>
            <h2 style={{ marginBottom: 6 }}>POST /logs (show-logs)</h2>
            <iframe
              key={`show-${refreshKey}`}
              src={showLogsUrl}
              title="POST logs"
              style={{ width: "100%", height: "40vh", border: "1px solid #24527a", borderRadius: 8, background: "#fff" }}
            />
          </section>

          <section>
            <h2 style={{ marginBottom: 6 }}>Middleware request logs (ulogs)</h2>
            <iframe
              key={`ulogs-${refreshKey}`}
              src={middlewareLogsUrl}
              title="Middleware logs"
              style={{ width: "100%", height: "40vh", border: "1px solid #24527a", borderRadius: 8, background: "#fff" }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
