"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

const upayAction = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";
const returnUrlBase =
  process.env.NEXT_PUBLIC_RETURN_URL || "https://youkar.vercel.app/after-payment";

const EXAMPLE_SONGS = [
  {
    title: "חנן בן ארי - אם תרצי (קליפ רשמי) Hanan Ben Ari",
    artist: "Hanan Ben Ari",
    duration: "176",
    youtube: "https://www.youtube.com/watch?v=Y-_XAt1OFNI",
    karaoke: "https://d23du7ibe4a1ni.cloudfront.net/Y-_XAt1OFNI/karaoke.mp3",
    vocals: "https://d23du7ibe4a1ni.cloudfront.net/Y-_XAt1OFNI/vocals.mp3",
  },
  {
    title: "אתי אנקרי- לוליטה (קליפ)",
    artist: "מוזיקה ישראלית",
    duration: "297",
    youtube: "https://www.youtube.com/watch?v=TumKKCSsaA0",
    karaoke: "https://d23du7ibe4a1ni.cloudfront.net/TumKKCSsaA0/karaoke.mp3",
    vocals: "https://d23du7ibe4a1ni.cloudfront.net/TumKKCSsaA0/vocals.mp3",
  },
  {
    title: "Dance Me to the End of Love",
    artist: "Leonard Cohen",
    duration: "4:41",
    youtube: "https://www.youtube.com/watch?v=8StKOyYY3Gs",
    karaoke: "https://d23du7ibe4a1ni.cloudfront.net/8StKOyYY3Gs/karaoke.mp3",
    vocals: "https://d23du7ibe4a1ni.cloudfront.net/8StKOyYY3Gs/vocals.mp3",
  },
  {
    title: "Leonard Cohen - Suzanne (Official Audio)",
    artist: "Leonard Cohen",
    duration: "3:51",
    youtube: "https://www.youtube.com/watch?v=svitEEpI07E",
    karaoke: "https://d23du7ibe4a1ni.cloudfront.net/svitEEpI07E/karaoke.mp3",
    vocals: "https://d23du7ibe4a1ni.cloudfront.net/svitEEpI07E/vocals.mp3",
  },
  {
    title: "יהודית רביץ - ארבע לפנות בוקר",
    artist: "יהודית רביץ",
    duration: "3:08",
    youtube: "https://www.youtube.com/watch?v=A_nJttXxq5o",
    karaoke: "https://d23du7ibe4a1ni.cloudfront.net/A_nJttXxq5o/karaoke.mp3",
    vocals: "https://d23du7ibe4a1ni.cloudfront.net/A_nJttXxq5o/vocals.mp3",
  },
];

function extractVideoId(link) {
  try {
    const url = new URL(link);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "") || null;
    }
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [queuedVideoId, setQueuedVideoId] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [activeSource, setActiveSource] = useState("mix");
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const ytHostRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const audioRef = useRef(null);
  const pendingActionRef = useRef(null);
  const sharedTimeRef = useRef(0);

  const [syncClock, setSyncClock] = useState("0:00");
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncDuration, setSyncDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
  const canCreate = Boolean(videoId && !queuedVideoId);

  const activeExample = EXAMPLE_SONGS[activeExampleIndex];

  const formatClock = (seconds) => {
    const safe = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  };

  const updateSyncPosition = (seconds) => {
    const safe = Math.max(0, Number(seconds) || 0);
    sharedTimeRef.current = safe;
    setSyncSeconds(safe);
    setSyncClock(formatClock(safe));
  };

  const updateSyncDuration = (duration) => {
    const safe = Math.max(0, Number(duration) || 0);
    setSyncDuration(safe);
  };

  const readCurrentTime = () => {
    if (activeSource === "mix" && ytPlayerRef.current?.getCurrentTime) {
      const time = Number(ytPlayerRef.current.getCurrentTime());
      return Number.isFinite(time) ? time : sharedTimeRef.current;
    }

    if (audioRef.current) {
      return Number.isFinite(audioRef.current.currentTime)
        ? audioRef.current.currentTime
        : sharedTimeRef.current;
    }

    return sharedTimeRef.current;
  };

  const pauseCurrent = () => {
    if (activeSource === "mix" && ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const playMixAtTime = (nextVideoId, startSeconds) => {
    if (!ytPlayerRef.current || !nextVideoId) return;

    ytPlayerRef.current.loadVideoById({
      videoId: nextVideoId,
      startSeconds,
    });

    window.setTimeout(() => {
      ytPlayerRef.current?.playVideo?.();
      setIsPlaying(true);
    }, 60);
  };

  const applyAction = () => {
    if (!pendingActionRef.current) return;

    const { songIndex, source } = pendingActionRef.current;
    const song = EXAMPLE_SONGS[songIndex];
    if (!song) return;

    if (source === "mix" && !ytPlayerRef.current) {
      return;
    }

    if ((source === "kar" || source === "voc") && !audioRef.current) {
      return;
    }

    const switchingSong = songIndex !== activeExampleIndex;
    const baseTime = switchingSong ? 0 : readCurrentTime();
    updateSyncPosition(baseTime);

    pauseCurrent();

    setActiveExampleIndex(songIndex);
    setActiveSource(source);

    if (source === "mix") {
      const nextVideoId = extractVideoId(song.youtube);
      if (ytPlayerRef.current && nextVideoId) {
        playMixAtTime(nextVideoId, sharedTimeRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else if (audioRef.current) {
      const nextSrc = source === "kar" ? song.karaoke : song.vocals;
      audioRef.current.src = nextSrc;
      audioRef.current.currentTime = sharedTimeRef.current;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    }

    pendingActionRef.current = null;
  };

  const handleExamplePlay = (songIndex, source) => {
    pendingActionRef.current = { songIndex, source };
    applyAction();
  };

  useEffect(() => {
    if (!window.YT || !window.YT.Player || ytPlayerRef.current || !ytHostRef.current) {
      return;
    }

    const defaultVideoId = extractVideoId(EXAMPLE_SONGS[0].youtube);
    ytPlayerRef.current = new window.YT.Player(ytHostRef.current, {
      width: "1",
      height: "1",
      videoId: defaultVideoId,
      playerVars: {
        controls: 0,
        autoplay: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: () => {
          const duration = ytPlayerRef.current?.getDuration?.();
          updateSyncDuration(duration);
          setYtReady(true);
        },
        onStateChange: (event) => {
          const duration = ytPlayerRef.current?.getDuration?.();
          updateSyncDuration(duration);

          const playing = window.YT?.PlayerState?.PLAYING;
          const paused = window.YT?.PlayerState?.PAUSED;
          const ended = window.YT?.PlayerState?.ENDED;
          if (event?.data === playing) {
            setIsPlaying(true);
          }
          if (event?.data === paused || event?.data === ended) {
            setIsPlaying(false);
          }
        },
      },
    });
  }, [ytApiLoaded]);

  useEffect(() => {
    if (!ytReady && pendingActionRef.current?.source === "mix") {
      return;
    }
    applyAction();
  }, [ytReady]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      if (activeSource === "mix" && ytPlayerRef.current?.getCurrentTime) {
        const t = Number(ytPlayerRef.current.getCurrentTime());
        const d = Number(ytPlayerRef.current.getDuration?.());
        if (Number.isFinite(d) && d > 0) {
          updateSyncDuration(d);
        }
        if (Number.isFinite(t)) {
          updateSyncPosition(t);
        }
      } else {
        updateSyncPosition(sharedTimeRef.current);
        if (audioRef.current?.duration && Number.isFinite(audioRef.current.duration)) {
          updateSyncDuration(audioRef.current.duration);
        }
      }
    }, 500);

    return () => {
      window.clearInterval(tick);
    };
  }, [activeSource]);

  const onAudioTimeUpdate = () => {
    if (activeSource !== "mix" && audioRef.current) {
      updateSyncPosition(audioRef.current.currentTime);
      if (audioRef.current.duration && Number.isFinite(audioRef.current.duration)) {
        updateSyncDuration(audioRef.current.duration);
      }
    }
  };

  const onAudioLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && Number.isFinite(audioRef.current.duration)) {
      updateSyncDuration(audioRef.current.duration);
    }
  };

  const onAudioPlay = () => {
    setIsPlaying(true);
  };

  const onAudioPause = () => {
    setIsPlaying(false);
  };

  const onSyncSeek = (e) => {
    const next = Number(e.target.value) || 0;
    updateSyncPosition(next);

    if (activeSource === "mix") {
      ytPlayerRef.current?.seekTo?.(next, true);
      ytPlayerRef.current?.playVideo?.();
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = next;
    }
  };

  const togglePlayPause = () => {
    if (activeSource === "mix") {
      if (isPlaying) {
        ytPlayerRef.current?.pauseVideo?.();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current?.playVideo?.();
        setIsPlaying(true);
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!videoId) return;

    setIsCreating(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/create-karaoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        const failedUrl = data?.backendCall?.url || "(unknown)";
        const failedBody = data?.backendCall?.body || "(unknown)";
        const failedPendingContent = JSON.stringify(
          data?.pendingContent ?? null,
          null,
          2
        );
        window.alert(
          `Create Karaoke failed.\nBackend URL: ${failedUrl}\nMethod: POST\nBody: ${failedBody}\nPending JSON: ${failedPendingContent}\nError: ${data.error || "Unknown error"}`
        );
        throw new Error(data.error || "Failed to create karaoke request");
      }

      setQueuedVideoId(data.queuedVideoId || videoId);
      setSongTitle(data.title || "YouTube song");

      const beUrl = data?.backendCall?.url || "(unknown)";
      const beBody = data?.backendCall?.body || "(unknown)";
      const beMessage = data?.backend?.message || "No backend message";
      const pendingContent = JSON.stringify(data?.pendingContent ?? null, null, 2);
      window.alert(
        `BE /api/pending call details:\nURL: ${beUrl}\nMethod: POST\nBody: ${beBody}\nResult: ${beMessage}\nPending JSON: ${pendingContent}`
      );

      setStatus({
        type: "success",
        message: "Karaoke request created. Continue to payment.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Could not create karaoke request",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const returnUrl = queuedVideoId
    ? `${returnUrlBase}?videoId=${encodeURIComponent(queuedVideoId)}`
    : returnUrlBase;

  return (
    <main className="page-bg">
      <img className="brand-logo" src="/youkar-logo.png" alt="YouKar logo" />
      <section className="card">
        <Script
          src="https://www.youtube.com/iframe_api"
          strategy="afterInteractive"
          onLoad={() => setYtApiLoaded(true)}
        />

        <div className="examples-panel">
          <h2>Example Songs</h2>
          <div className="examples-table-wrap">
            <table className="examples-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>MIX</th>
                  <th>KAR</th>
                  <th>VOC</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_SONGS.map((song, idx) => (
                    <tr
                      key={song.youtube}
                      className={idx === activeExampleIndex ? "is-active-row" : ""}
                    >
                    <td>{song.title}</td>
                    <td>
                      <button
                        type="button"
                          className={`mini-btn yt-btn ${
                            idx === activeExampleIndex && activeSource === "mix"
                              ? "is-active"
                              : ""
                          }`}
                        onClick={() => handleExamplePlay(idx, "mix")}
                          aria-pressed={idx === activeExampleIndex && activeSource === "mix"}
                      >
                        MIX
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                          className={`mini-btn karaoke-btn ${
                            idx === activeExampleIndex && activeSource === "kar"
                              ? "is-active"
                              : ""
                          }`}
                        onClick={() => handleExamplePlay(idx, "kar")}
                          aria-pressed={idx === activeExampleIndex && activeSource === "kar"}
                      >
                        KAR
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                          className={`mini-btn vocals-btn ${
                            idx === activeExampleIndex && activeSource === "voc"
                              ? "is-active"
                              : ""
                          }`}
                        onClick={() => handleExamplePlay(idx, "voc")}
                          aria-pressed={idx === activeExampleIndex && activeSource === "voc"}
                      >
                        VOC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mini-player-wrap">
            <p className="field-hint">
              Now Playing: {activeExample.title} ({activeSource.toUpperCase()})
            </p>
            <p className="field-hint">Sync time: {syncClock} (example: 1:23)</p>
            <div className="sync-controls" role="group" aria-label="Playback controls">
              <button
                type="button"
                className="sync-play-btn"
                onClick={togglePlayPause}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <input
                type="range"
                min="0"
                max={Math.max(1, Math.floor(syncDuration || 0))}
                step="1"
                value={Math.min(Math.floor(syncSeconds || 0), Math.max(1, Math.floor(syncDuration || 0)))}
                onChange={onSyncSeek}
                className="sync-slider"
                aria-label="Playback position"
              />
              <p className="sync-time">
                {formatClock(syncSeconds)} / {formatClock(syncDuration)}
              </p>
            </div>
            <div className="mini-player hidden-player" aria-hidden="true">
              <div ref={ytHostRef} />
            </div>
            <audio
              ref={audioRef}
              className="tiny-audio hidden"
              onTimeUpdate={onAudioTimeUpdate}
              onLoadedMetadata={onAudioLoadedMetadata}
              onPlay={onAudioPlay}
              onPause={onAudioPause}
            />
          </div>
        </div>

        <h1>Create Karaoke In 4 Steps</h1>
        <p className="lead">
          1) Paste YouTube link, 2) Preview clip, 3) Create karaoke, 4) Pay and
          receive CDN download links.
        </p>

        <form className="request-form" onSubmit={submitCreate}>
          <label htmlFor="youtube">YouTube Song Link</label>
          <input
            id="youtube"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={youtubeUrl}
            onChange={(e) => {
              const nextUrl = e.target.value;
              const nextVideoId = extractVideoId(nextUrl);

              setYoutubeUrl(nextUrl);
              if (nextVideoId) {
                pauseCurrent();
              }
              setQueuedVideoId("");
              setStatus({ type: "idle", message: "" });
            }}
            required
          />

          {youtubeUrl && !videoId ? (
            <p className="field-hint error">Please use a valid YouTube URL.</p>
          ) : null}

          <button
            type="submit"
            disabled={!canCreate || isCreating}
            className={canCreate ? "primary-cta is-highlight" : "primary-cta"}
          >
            {isCreating ? "Creating..." : "Create Karaoke"}
          </button>

          {videoId ? (
            <div className="preview-wrap">
              <p className="preview-label">Clip preview</p>
              <iframe
                title="YouTube preview"
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : null}
        </form>

        {status.type !== "idle" ? (
          <p className={`result ${status.type}`}>{status.message}</p>
        ) : null}

        {queuedVideoId ? (
          <div className="payment-panel">
            <h2>Complete Payment</h2>
            <p className="hint">You are paying for: {songTitle}</p>
            <form
              name="upayform"
              action={upayAction}
              method="post"
              className="upay-form"
            >
              <input type="hidden" value="ipadtal@gmail.com" name="email" />
              <input type="hidden" value="5" name="amount" />
              <input type="hidden" value={returnUrl} name="returnurl" />
              <input type="hidden" value="" name="ipnurl" />
              <input
                type="hidden"
                value={`קובץ סאונד ${queuedVideoId}`}
                name="paymentdetails"
              />
              <input type="hidden" value="1" name="maxpayments" />
              <input type="hidden" value="1" name="livesystem" />
              <input type="hidden" value="" name="commissionreduction" />
              <input type="hidden" value="1" name="createinvoiceandreceipt" />
              <input type="hidden" value="0" name="createinvoice" />
              <input type="hidden" value="0" name="createreceipt" />
              <input type="hidden" value="UPAY" name="refername" />
              <input type="hidden" value="EN" name="lang" />
              <input type="hidden" value="NIS" name="currency" />

              <input
                type="image"
                src="https://app.upay.co.il/BANKRESOURCES/UPAY/images/buttons/payment-button1EN.png"
                name="submit"
                alt="Make payments with upay"
                className={videoId ? "payment-image-btn is-highlight" : "payment-image-btn"}
              />
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
