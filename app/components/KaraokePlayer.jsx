"use client";

import { useEffect, useRef, useState } from "react";

/**
 * KaraokePlayer
 *
 * Props:
 *  - videoId     {string}  Kept for API compatibility with parent callers
 *  - karaokeUrl  {string}  CDN URL for the karaoke (no-vocals) MP3
 *  - vocalsUrl   {string}  CDN URL for the vocals-only MP3
 *  - selectedTrack {"mix"|"kar"|"voc"} Currently selected track from parent
 *  - downloadText {string} Label for download buttons (default "Download")
 */
export default function KaraokePlayer({
  videoId,
  karaokeUrl,
  vocalsUrl,
  selectedTrack = "kar",
  downloadText = "Download",
}) {
  const [activeChannel, setActiveChannel] = useState("karaoke");
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const karaokeAudioRef = useRef(null);
  const vocalsAudioRef = useRef(null);
  const isSyncingRef = useRef(false);
  const originParam = typeof window !== "undefined"
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : "";
  const ytEmbedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1${originParam}`
    : "";

  const getAudioPair = (source) => {
    const primary = source === "vocals" ? vocalsAudioRef.current : karaokeAudioRef.current;
    const secondary = source === "vocals" ? karaokeAudioRef.current : vocalsAudioRef.current;
    return { primary, secondary };
  };

  useEffect(() => {
    const mappedChannel = selectedTrack === "mix" ? "mix" : selectedTrack === "voc" ? "vocals" : "karaoke";
    setActiveChannel(mappedChannel);
    setIsPlaying(false);

    const karaoke = karaokeAudioRef.current;
    const vocals = vocalsAudioRef.current;
    if (karaoke) karaoke.pause();
    if (vocals) vocals.pause();
  }, [selectedTrack, videoId, karaokeUrl, vocalsUrl]);

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

    if (Number.isFinite(primary.currentTime)) setSyncSeconds(primary.currentTime);

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
    if (source === "mix") {
      primary.muted = false;
      secondary.muted = false;
    } else {
      primary.muted = false;
      secondary.muted = true;
    }

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

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseSynced(activeChannel);
    } else {
      playSynced(activeChannel);
    }
  };

  const selectChannel = (source) => {
    setActiveChannel(source);
    if (isPlaying) playSynced(source);
  };

  return (
    <div>
      <div className="download-links">
        <div className="download-row">
          <span className="download-label" aria-hidden="true">🎵</span>
          <div className="download-actions">
            <audio controls src={karaokeUrl} className="inline-audio" preload="none"></audio>
            <a href={karaokeUrl} download className="download-btn" target="_blank" rel="noreferrer">
              {downloadText}
            </a>
          </div>
        </div>
        <div className="download-row">
          <span className="download-label" aria-hidden="true">🎤</span>
          <div className="download-actions">
            <audio controls src={vocalsUrl} className="inline-audio" preload="none"></audio>
            <a href={vocalsUrl} download className="download-btn" target="_blank" rel="noreferrer">
              {downloadText}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
