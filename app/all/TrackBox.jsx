import React from "react";

function formatDuration(duration) {
  if (!duration) return "-";
  if (typeof duration === "string" && duration.includes(":")) return duration;
  const secs = parseInt(duration, 10);
  if (isNaN(secs)) return duration;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

import { useRef, useState } from "react";

export default function TrackBox({ t, ytImgUrl, onTitleClick, onKarClick, onVocClick }) {
  // Helper to detect Hebrew (basic check)
  const isHebrew = str => /[\u0590-\u05FF]/.test(str);
  const titleIsHebrew = isHebrew(t.title || "");
  const maxLen = 25;
  const [marqueeIdx, setMarqueeIdx] = useState(0);
  const [marqueeActive, setMarqueeActive] = useState(false);
  const marqueeTimer = useRef(null);

  const getMarqueeTitle = (title) => {
    if (!title) return "(ללא כותרת)";
    if (title.length <= maxLen) return title;
    if (!marqueeActive) {
      // Not animating, show trimmed
      if (titleIsHebrew) {
        // Show the end (RTL trim)
        return "…" + title.slice(title.length - (maxLen - 1));
      } else {
        return title.slice(0, maxLen - 1) + "…";
      }
    }
    // Animate: show a moving window
    if (titleIsHebrew) {
      // RTL: move window from right to left (show end to start), start with trimmed RTL
      // On hover, start with the trimmed RTL, then move window left (decreasing start)
      const maxIdx = title.length - maxLen + 1;
      const start = Math.max(0, title.length - (maxLen - 1) - marqueeIdx);
      const end = title.length - marqueeIdx;
      let visible = title.slice(start, end);
      if (visible.length < maxLen - 1) visible = visible.padStart(maxLen - 1, ' ');
      return "…" + visible;
    } else {
      // LTR: move window from left to right (show start to end)
      const start = marqueeIdx;
      const end = start + maxLen - 1;
      let visible = title.slice(start, end);
      if (visible.length < maxLen - 1) visible = visible.padEnd(maxLen - 1, ' ');
      return visible + "…";
    }
  };

  const titleRef = useRef(null);
  const boxRef = useRef(null);

  // On hover, animate the title by updating the visible substring
  const handleMouseEnter = () => {
    if (!t.title || t.title.length <= maxLen) return;
    setMarqueeActive(true);
    let idx = 0;
    const maxIdx = t.title.length - maxLen + 1;
    setMarqueeIdx(0);
    marqueeTimer.current = setInterval(() => {
      setMarqueeIdx(i => {
        if (i >= maxIdx) {
          clearInterval(marqueeTimer.current);
          setTimeout(() => setMarqueeActive(false), 500);
          return 0;
        }
        return i + 1;
      });
    }, 80);
  };
  const handleMouseLeave = () => {
    setMarqueeActive(false);
    setMarqueeIdx(0);
    if (marqueeTimer.current) clearInterval(marqueeTimer.current);
  };
  return (
    <div
      key={t.folder}
      ref={boxRef}
      style={{
        background: "#0a2342",
        color: "#fff",
        borderRadius: 8,
        padding: "10px 14px",
        minHeight: 40,
        boxShadow: "0 2px 8px #0001",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        marginBottom: 8,
        cursor: "pointer"
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {ytImgUrl && (
        <img
          src={ytImgUrl}
          alt="yt thumbnail"
          style={{ width: 36, height: 27, borderRadius: 4, objectFit: "cover", marginRight: 4 }}
        />
      )}
      <span
        ref={titleRef}
        style={{
          fontWeight: 700,
          fontSize: 14,
          cursor: "pointer",
          textDecoration: "underline dotted",
          color: "#2196f3",
          direction: titleIsHebrew ? "rtl" : "ltr",
          textAlign: "center",
          flex: 1,
          alignSelf: "center",
          display: "inline-block",
          whiteSpace: "nowrap",
          overflow: "hidden",
          width: 170,
          height: 22,
          boxSizing: "border-box"
        }}
        onClick={() => onTitleClick(t)}
        title="הצג meta.json המלא"
      >
        {getMarqueeTitle(t.title)}
      </span>
      <span style={{ color: "#666", fontSize: 12 }}>⏱ {formatDuration(t.duration)}</span>
      <span
        title="KAR"
        style={{ cursor: t.hasKar ? "pointer" : "default", opacity: t.hasKar ? 1 : 0.2, direction: "rtl", textAlign: "right" }}
        onClick={t.hasKar ? () => onKarClick(t) : undefined}
      >
        🎤
      </span>
      <span
        title="VOC"
        style={{ cursor: t.hasVoc ? "pointer" : "default", opacity: t.hasVoc ? 1 : 0.2, direction: "rtl", textAlign: "right" }}
        onClick={t.hasVoc ? () => onVocClick(t) : undefined}
      >
        👤
      </span>
      <span
        title="בקשות"
        style={{ marginRight: "auto", color: "#b55", fontWeight: 700, cursor: t.requestsData ? "pointer" : "default" }}
        onMouseEnter={t.onRequestsHover}
        onMouseLeave={t.onRequestsLeave}
      >
        {t.requests}
      </span>
      {t.requestsTooltip}
    </div>
  );
}
