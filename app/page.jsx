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
  const INPUT_ROW_INDEX = -1;
  const [lang, setLang] = useState("he");
  const [youtubeUrl, setYoutubeUrl] = useState("erik clepton");
  const [songSearchResults, setSongSearchResults] = useState([]);
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("972");
  const [waStatus, setWaStatus] = useState({ type: "idle", message: "" });
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);
  const [waVerified, setWaVerified] = useState(false);
  const [queuedVideoId, setQueuedVideoId] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [inputSongTitle, setInputSongTitle] = useState("");
  const [inputKarUrl, setInputKarUrl] = useState("");
  const [inputVocUrl, setInputVocUrl] = useState("");
  const [loadingInputLinks, setLoadingInputLinks] = useState(false);
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

  const copy = {
    he: {
      headline: "כל לינק יוטיוב לקריוקי תוך כמה שניות!",
      lead: "הדבקה, אימות ויצירת בקשה לקריוקי במהירות.",
      step1: "1) לינק/חיפוש יוטיוב",
      searchPlaceholder: "הדבק לינק יוטיוב או חפש שיר...",
      searchLoading: "מחפש שירים...",
      noResults: "לא נמצאו תוצאות",
      invalidYoutube: "נא להכניס לינק YouTube תקין.",
      phonePlaceholder: "מספר טלפון ל-WhatsApp (לדוגמה 972501234567)",
      phoneInvalid: "נא להזין מספר טלפון תקין ל-WhatsApp.",
      sendWa: "2) שלח WA",
      sendingWa: "2) שולח...",
      create: "3) צור קריוקי",
      creating: "3) יוצר...",
      createQuick: "צור קריוקי",
      inputSongFallback: "שיר מהקלט",
    },
    en: {
      headline: "Any YOUTUBE link to a karaoke playback in just a few sec!",
      lead: "Paste, verify, and create your karaoke request in seconds.",
      step1: "1) YouTube Song Link/Search",
      searchPlaceholder: "Paste YouTube URL or search song title...",
      searchLoading: "Searching songs...",
      noResults: "No results found",
      invalidYoutube: "Please use a valid YouTube URL.",
      phonePlaceholder: "Phone number for WhatsApp (e.g. 972501234567)",
      phoneInvalid: "Enter a valid phone number to send WhatsApp.",
      sendWa: "2) Send WA",
      sendingWa: "2) Sending...",
      create: "3) Create Karaoke",
      creating: "3) Creating...",
      createQuick: "Create Karaoke",
      inputSongFallback: "Input song",
    },
  };

  const ui = copy[lang] || copy.he;

  const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
  const looksLikeUrl = useMemo(() => {
    const value = youtubeUrl.trim().toLowerCase();
    return value.startsWith("http") || value.includes("youtube.com") || value.includes("youtu.be");
  }, [youtubeUrl]);
  const normalizedPhone = useMemo(
    () => phoneNumber.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, ""),
    [phoneNumber]
  );
  const hasValidPhone = useMemo(() => /^\+?\d{8,15}$/.test(normalizedPhone), [normalizedPhone]);
  const canCreate = Boolean(videoId && !queuedVideoId && waVerified);

  const activeExample = activeExampleIndex === INPUT_ROW_INDEX
    ? {
      title: inputSongTitle || ui.inputSongFallback,
      youtube: youtubeUrl,
      karaoke: inputKarUrl,
      vocals: inputVocUrl,
    }
    : EXAMPLE_SONGS[activeExampleIndex];

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

  const ensureMixPlayback = () => {
    const player = ytPlayerRef.current;
    if (!player) return;

    player.playVideo?.();

    window.setTimeout(() => {
      const playingState = window.YT?.PlayerState?.PLAYING;
      const currentState = player.getPlayerState?.();

      if (playingState !== undefined && currentState !== playingState) {
        // Live browsers sometimes block unmuted autoplay; muted retry is more reliable.
        player.mute?.();
        player.playVideo?.();
        window.setTimeout(() => {
          player.unMute?.();
        }, 450);
      }
    }, 160);
  };

  const playMixAtTime = (nextVideoId, startSeconds) => {
    if (!ytPlayerRef.current || !nextVideoId) return;

    ytPlayerRef.current.loadVideoById({
      videoId: nextVideoId,
      startSeconds,
    });

    window.setTimeout(() => {
      ensureMixPlayback();
      setIsPlaying(true);
    }, 60);
  };

  const applyAction = () => {
    if (!pendingActionRef.current) return;

    const { songIndex, source } = pendingActionRef.current;
    const song = EXAMPLE_SONGS[songIndex];
    if (!song) return;

    if (source === "mix" && (!ytPlayerRef.current || !ytReady)) {
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
    const isSameSelection =
      songIndex === activeExampleIndex && source === activeSource;

    if (isSameSelection) {
      if (source === "mix" && !ytReady) {
        pendingActionRef.current = { songIndex, source };
        return;
      }
      togglePlayPause();
      return;
    }

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
        enablejsapi: 1,
        controls: 0,
        autoplay: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
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

  useEffect(() => {
    const query = youtubeUrl.trim();
    const shouldSearch = query.length >= 3 && !extractVideoId(query);

    if (!shouldSearch) {
      setSongSearchResults([]);
      setShowSongDropdown(false);
      setIsSearchingSongs(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setShowSongDropdown(true);
      setIsSearchingSongs(true);
      try {
        const response = await fetch("/api/youtube/get-song-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: query, artist: "", genre: "" }),
          signal: controller.signal,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not fetch song search list");
        }

        const nextResults = Array.isArray(data?.songs) ? data.songs.slice(0, 5) : [];
        setSongSearchResults(nextResults);
  setShowSongDropdown(true);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setSongSearchResults([]);
        setShowSongDropdown(true);
      } finally {
        setIsSearchingSongs(false);
      }
    }, 1000);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [youtubeUrl]);

  useEffect(() => {
    if (!videoId) {
      setInputSongTitle("");
      setInputKarUrl("");
      setInputVocUrl("");
      setLoadingInputLinks(false);
      return;
    }

    let cancelled = false;

    const readTitle = async () => {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          if (!cancelled) {
            setInputSongTitle(`YouTube ${videoId}`);
          }
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setInputSongTitle(data?.title || `YouTube ${videoId}`);
        }
      } catch {
        if (!cancelled) {
          setInputSongTitle(`YouTube ${videoId}`);
        }
      }
    };

    readTitle();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    if (!videoId) {
      setInputKarUrl("");
      setInputVocUrl("");
      setLoadingInputLinks(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadLinks = async () => {
      setLoadingInputLinks(true);
      try {
        const response = await fetch(`/api/cdn-links?videoId=${encodeURIComponent(videoId)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Could not fetch CDN links");
        }

        const links = Array.isArray(data?.links) ? data.links : [];
        const kar = links.find((item) => {
          const label = String(item?.label || "").toLowerCase();
          const url = String(item?.url || "").toLowerCase();
          return label.includes("kar") || label.includes("kara") || url.includes("/karaoke") || url.includes("kar");
        })?.url || "";

        const voc = links.find((item) => {
          const label = String(item?.label || "").toLowerCase();
          const url = String(item?.url || "").toLowerCase();
          return label.includes("voc") || label.includes("vocal") || url.includes("/vocals") || url.includes("voc");
        })?.url || "";

        if (!cancelled) {
          setInputKarUrl(String(kar || ""));
          setInputVocUrl(String(voc || ""));
        }
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          setInputKarUrl("");
          setInputVocUrl("");
        }
      } finally {
        if (!cancelled) {
          setLoadingInputLinks(false);
        }
      }
    };

    loadLinks();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [videoId]);

  const handleInputRowPlay = (source) => {
    if (!videoId) return;

    const sourceToPlay = source === "kar" && !inputKarUrl ? "mix" : source;

    if (activeExampleIndex === INPUT_ROW_INDEX && activeSource === sourceToPlay) {
      if (sourceToPlay === "mix" && !ytReady) return;
      togglePlayPause();
      return;
    }

    const baseTime = activeExampleIndex === INPUT_ROW_INDEX ? readCurrentTime() : 0;
    updateSyncPosition(baseTime);
    pauseCurrent();

    setActiveExampleIndex(INPUT_ROW_INDEX);
    setActiveSource(sourceToPlay);

    if (sourceToPlay === "mix") {
      playMixAtTime(videoId, sharedTimeRef.current);
      return;
    }

    const nextSrc = sourceToPlay === "kar" ? inputKarUrl : inputVocUrl;
    if (!audioRef.current || !nextSrc) {
      setIsPlaying(false);
      return;
    }

    audioRef.current.src = nextSrc;
    audioRef.current.currentTime = sharedTimeRef.current;
    audioRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      setIsPlaying(false);
    });
  };

  const handleSongPick = (song) => {
    const nextUrl = String(song?.youtubeUrl || "");
    const nextVideoId = extractVideoId(nextUrl);

    setYoutubeUrl(nextUrl);
    if (nextVideoId) {
      pauseCurrent();
    }
    setShowSongDropdown(false);
    setSongSearchResults([]);
    setWaVerified(false);
    setWaStatus({ type: "idle", message: "" });
    setQueuedVideoId("");
    setStatus({ type: "idle", message: "" });
  };

  const getSongThumbnail = (song) => {
    const url = String(song?.youtubeUrl || "");
    const songVideoId = extractVideoId(url);
    if (!songVideoId) return "";
    return `https://i.ytimg.com/vi/${songVideoId}/mqdefault.jpg`;
  };

  const onSyncSeek = (e) => {
    const next = Number(e.target.value) || 0;
    updateSyncPosition(next);

    if (activeSource === "mix") {
      ytPlayerRef.current?.seekTo?.(next, true);
      ensureMixPlayback();
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
        ensureMixPlayback();
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

  const sendWhatsApp = async () => {
    if (!videoId || !hasValidPhone || isSendingWa) return;

    setIsSendingWa(true);
    setWaStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          youtubeUrl,
          videoId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not send WhatsApp request");
      }

      setWaVerified(true);
      setWaStatus({
        type: "success",
        message: "WhatsApp verification sent successfully.",
      });
    } catch (error) {
      setWaVerified(false);
      setWaStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Could not send WhatsApp request",
      });
    } finally {
      setIsSendingWa(false);
    }
  };

  const createKaraoke = async () => {
    if (!videoId) return;
    if (!waVerified) {
      setStatus({
        type: "error",
        message: "Please verify WhatsApp first.",
      });
      return;
    }

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

  const submitCreate = async (e) => {
    e.preventDefault();
    await createKaraoke();
  };

  const returnUrl = queuedVideoId
    ? `${returnUrlBase}?videoId=${encodeURIComponent(queuedVideoId)}`
    : returnUrlBase;

  return (
    <main className="page-bg">
      <section className={`card ${lang === "he" ? "lang-he" : "lang-en"}`}>
        <Script
          src="https://www.youtube.com/iframe_api"
          strategy="afterInteractive"
          onLoad={() => setYtApiLoaded(true)}
        />

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

        <img className="brand-logo" src="/youkar-logo.png" alt="YouKar logo" />

        <h1>{ui.headline}</h1>
        <p className="lead">{ui.lead}</p>

        <form className="request-form" onSubmit={submitCreate} dir={lang === "he" ? "rtl" : "ltr"}>
          <label htmlFor="youtube">{ui.step1}</label>
          <div className="search-input-wrap">
            <input
              id="youtube"
              type="text"
              placeholder={ui.searchPlaceholder}
              value={youtubeUrl}
              onChange={(e) => {
                const nextUrl = e.target.value;
                const nextVideoId = extractVideoId(nextUrl);

                setYoutubeUrl(nextUrl);
                if (nextVideoId) {
                  pauseCurrent();
                }
                setWaVerified(false);
                setWaStatus({ type: "idle", message: "" });
                setQueuedVideoId("");
                setStatus({ type: "idle", message: "" });
              }}
              required
            />

            {showSongDropdown ? (
              <div className="search-dropdown" role="listbox" aria-label="Song search suggestions">
                {isSearchingSongs ? (
                  <div className="search-dropdown-state">{ui.searchLoading}</div>
                ) : null}

                {!isSearchingSongs && songSearchResults.length === 0 ? (
                  <div className="search-dropdown-state">{ui.noResults}</div>
                ) : null}

                {!isSearchingSongs && songSearchResults.length > 0
                  ? songSearchResults.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      className="search-dropdown-item"
                      onClick={() => handleSongPick(song)}
                    >
                      {getSongThumbnail(song) ? (
                        <img
                          src={getSongThumbnail(song)}
                          alt="YouTube thumbnail"
                          className="search-dropdown-thumb"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="search-dropdown-meta">
                        <span className="search-dropdown-title">{song.title}</span>
                        {song.artist ? (
                          <span className="search-dropdown-sub">{song.artist}</span>
                        ) : null}
                      </span>
                    </button>
                  ))
                  : null}
              </div>
            ) : null}
          </div>

          {isSearchingSongs ? (
            <p className="field-hint">{ui.searchLoading}</p>
          ) : null}

          {youtubeUrl && !videoId && looksLikeUrl ? (
            <p className="field-hint error">{ui.invalidYoutube}</p>
          ) : null}

          <div className="wa-row">
            <input
              type="tel"
              inputMode="tel"
              placeholder={ui.phonePlaceholder}
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                setWaVerified(false);
                setWaStatus({ type: "idle", message: "" });
                setStatus({ type: "idle", message: "" });
              }}
            />
            <button
              type="button"
              className="wa-send-btn"
              onClick={sendWhatsApp}
              disabled={!videoId || !hasValidPhone || isSendingWa}
              title="Send WhatsApp verification"
              aria-label="Send WhatsApp verification"
            >
              <svg viewBox="0 0 24 24" className="wa-icon" aria-hidden="true">
                <path
                  d="M20 12a8 8 0 0 1-11.7 7l-4.3 1.2 1.4-4.1A8 8 0 1 1 20 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.4 8.9c.2-.5.5-.5.7-.5h.6c.2 0 .4.1.5.3l1 2c.1.2.1.4 0 .6l-.5.8c-.1.2-.1.4 0 .6.3.6.9 1.3 1.6 1.8.2.2.4.2.6.1l.8-.5c.2-.1.4-.1.6 0l2 1c.2.1.3.3.3.5v.6c0 .2 0 .5-.5.7-.5.2-1.8.6-3.8-.2-1.1-.4-2.3-1.3-3.3-2.3-1-1-1.9-2.2-2.3-3.3-.8-2-.4-3.3-.2-3.8Z"
                  fill="currentColor"
                />
              </svg>
              {isSendingWa ? ui.sendingWa : ui.sendWa}
            </button>
          </div>

          {phoneNumber && !hasValidPhone ? (
            <p className="field-hint error">{ui.phoneInvalid}</p>
          ) : null}

          {waStatus.type !== "idle" ? (
            <p className={`field-hint ${waStatus.type}`}>{waStatus.message}</p>
          ) : null}

          <button
            type="submit"
            disabled={!canCreate || isCreating}
            className={canCreate ? "primary-cta is-highlight" : "primary-cta"}
          >
            {isCreating ? ui.creating : ui.create}
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
                {videoId && inputSongTitle ? (
                  <tr className="input-song-row">
                    <td>{inputSongTitle}</td>
                    <td>
                      <button
                        type="button"
                        className={`mini-btn yt-btn ${
                          activeExampleIndex === INPUT_ROW_INDEX && activeSource === "mix"
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() => handleInputRowPlay("mix")}
                        aria-pressed={activeExampleIndex === INPUT_ROW_INDEX && activeSource === "mix"}
                        title="Play input YouTube mix"
                      >
                        MIX
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`mini-btn karaoke-btn ${
                          activeExampleIndex === INPUT_ROW_INDEX
                          && (activeSource === "kar" || (activeSource === "mix" && !inputKarUrl))
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() => handleInputRowPlay("kar")}
                        aria-pressed={activeExampleIndex === INPUT_ROW_INDEX
                          && (activeSource === "kar" || (activeSource === "mix" && !inputKarUrl))}
                        disabled={loadingInputLinks || !videoId}
                        title={inputKarUrl ? "Play input karaoke" : "Play input YouTube mix"}
                      >
                        KAR
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`mini-btn vocals-btn ${
                          activeExampleIndex === INPUT_ROW_INDEX && activeSource === "voc"
                            ? "is-active"
                            : ""
                        }`}
                        onClick={() => handleInputRowPlay("voc")}
                        aria-pressed={activeExampleIndex === INPUT_ROW_INDEX && activeSource === "voc"}
                        disabled={!inputVocUrl || loadingInputLinks}
                        title="Play input vocals"
                      >
                        VOC
                      </button>
                    </td>
                  </tr>
                ) : null}
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
                        title="Play YouTube mix (original track)"
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
                        title="Play karaoke instrumental"
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
                        title="Play vocals only"
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
