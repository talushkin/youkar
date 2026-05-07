"use client";

import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

const returnUrlBase =
  process.env.NEXT_PUBLIC_RETURN_URL || "https://youkar.vercel.app/after-payment";

const DEFAULT_YT_QUERY = {
  he: "שלמה ארצי",
  en: "eric clepton",
};

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
  const [lang, setLang] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("youkar-lang") || "he";
    }
    return "he";
  });
  const [youtubeUrl, setYoutubeUrl] = useState(() => {
    if (typeof window !== "undefined") {
      const storedLang = localStorage.getItem("youkar-lang") || "he";
      return DEFAULT_YT_QUERY[storedLang] || DEFAULT_YT_QUERY.he;
    }
    return DEFAULT_YT_QUERY.he;
  });
  const [songSearchResults, setSongSearchResults] = useState([]);
  const [youtubeDisplayValue, setYoutubeDisplayValue] = useState("");
  const [isSearchingSongs, setIsSearchingSongs] = useState(false);
  const [showSongDropdown, setShowSongDropdown] = useState(false);
  const [phoneAreaCode, setPhoneAreaCode] = useState("050");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [queuedVideoId, setQueuedVideoId] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [inputSongTitle, setInputSongTitle] = useState("");
  const [inputSongArtist, setInputSongArtist] = useState("");
  const [inputSongDuration, setInputSongDuration] = useState("");
  const [inputKarUrl, setInputKarUrl] = useState("");
  const [inputVocUrl, setInputVocUrl] = useState("");
  const [loadingInputLinks, setLoadingInputLinks] = useState(false);
  const [cdnFilesReady, setCdnFilesReady] = useState(false);
  const [isInPendingQueue, setIsInPendingQueue] = useState(false);
  const [activeExampleIndex, setActiveExampleIndex] = useState(0);
  const [activeSource, setActiveSource] = useState("mix");
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const ytHostRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const previewIframeRef = useRef(null);
  const previewTimeRef = useRef(0);
  const previewDurationRef = useRef(0);
  const karAudioRef = useRef(null);
  const vocAudioRef = useRef(null);
  const isSyncingAudioRef = useRef(false);
  const createButtonRef = useRef(null);
  const createHintTimerRef = useRef(null);
  const pendingActionRef = useRef(null);
  const sharedTimeRef = useRef(0);
  const soloSourceRef = useRef(null);

  const [syncClock, setSyncClock] = useState("0:00");
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncDuration, setSyncDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewVideoId, setPreviewVideoId] = useState("");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewMuted, setPreviewMuted] = useState(false);
  const [showCreateHint, setShowCreateHint] = useState(false);
  const [soloSource, setSoloSource] = useState(null);

  const copy = {
    he: {
      headline: "קריוקי לכל יוטיוב תוך שניות",
      lead: "הדבקה, אימות ויצירת בקשה לקריוקי במהירות.",
      step1: "לינק/חיפוש יוטיוב",
      searchPlaceholder: "Search YouTube or paste link here",
      searchLoading: "מחפש שירים...",
      noResults: "לא נמצאו תוצאות",
      invalidYoutube: "נא להכניס לינק YouTube תקין.",
      phonePlaceholder: "מספר טלפון ל-WhatsApp",
      phoneInvalid: "נא לבחור קידומת 050-058 ולהזין 7 ספרות.",
      create: "צור קריוקי",
      creating: "יוצר...",
      createQuick: "צור קריוקי",
      inputSongFallback: "שיר מהקלט",
      alreadyHasKaraoke: "לשיר הזה כבר יש גרסת קריוקי ווקאל!",
      alreadyHasKaraokeAction: "שלם וקבל את הקבצים →",
      examplesTitle: "שירים לדוגמה",
      colTitle: "כותרת",
      colMix: "מיקס",
      colKar: "קריוקי",
      colVoc: "ווקאל",
      nowPlaying: "מתנגן כעת",
      syncTime: "זמן סנכרון",
      play: "נגן",
      pause: "עצור",
      clipPreview: "תצוגת קליפ",
    },
    en: {
      headline: "Any YOUTUBE link to a karaoke playback in just a few sec!",
      lead: "Paste, verify, and create your karaoke request in seconds.",
      step1: "YouTube Song Link/Search",
      searchPlaceholder: "Search YouTube or paste link here",
      searchLoading: "Searching songs...",
      noResults: "No results found",
      invalidYoutube: "Please use a valid YouTube URL.",
      phonePlaceholder: "Phone number for WhatsApp",
      phoneInvalid: "Choose area code 050-058 and enter 7 digits.",
      create: "Create Karaoke",
      creating: "Creating...",
      createQuick: "Create Karaoke",
      inputSongFallback: "Input song",
      alreadyHasKaraoke: "This track already has a karaoke & vocals version!",
      alreadyHasKaraokeAction: "Pay & get your files →",
      examplesTitle: "Example Songs",
      colTitle: "TITLE",
      colMix: "MIX",
      colKar: "KAR",
      colVoc: "VOC",
      nowPlaying: "Now Playing",
      syncTime: "Sync time",
      play: "Play",
      pause: "Pause",
      clipPreview: "Clip preview",
    },
  };

  const ui = copy[lang] || copy.he;

  const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
  const looksLikeUrl = useMemo(() => {
    const value = youtubeUrl.trim().toLowerCase();
    return value.startsWith("http") || value.includes("youtube.com") || value.includes("youtu.be");
  }, [youtubeUrl]);
  const normalizedPhone = useMemo(
    () => `${phoneAreaCode}${phoneNumber}`.replace(/[^\d]/g, ""),
    [phoneAreaCode, phoneNumber]
  );
  const hasValidPhone = useMemo(() => phoneNumber.length === 7 && /^\d{7}$/.test(phoneNumber), [phoneNumber]);
  const canCreate = Boolean(videoId && hasValidPhone && !queuedVideoId);
  const paymentEnabled = cdnFilesReady || isInPendingQueue;
  const currentPreviewVideoId = previewVideoId || videoId;
  const sourceLabel = {
    mix: ui.colMix,
    kar: ui.colKar,
    voc: ui.colVoc,
  };

  const activeExample = activeExampleIndex === INPUT_ROW_INDEX
    ? {
      title: inputSongTitle || ui.inputSongFallback,
      youtube: youtubeUrl,
      karaoke: inputKarUrl,
      vocals: inputVocUrl,
    }
    : EXAMPLE_SONGS[activeExampleIndex];

  const switchLanguage = (nextLang) => {
    setLang(nextLang);
    localStorage.setItem("youkar-lang", nextLang);
    setYoutubeDisplayValue("");
    setYoutubeUrl((prev) => {
      const trimmed = String(prev || "").trim();
      const isDefaultSeed = trimmed === DEFAULT_YT_QUERY.he || trimmed === DEFAULT_YT_QUERY.en;
      if (!trimmed || isDefaultSeed) {
        return DEFAULT_YT_QUERY[nextLang] || DEFAULT_YT_QUERY.en;
      }
      return prev;
    });
  };

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

  const autoplayPreview = (nextVideoId, startSeconds = 0, muted = false) => {
    if (!nextVideoId) return;
    const safeStart = Math.max(0, Math.floor(Number(startSeconds) || 0));
    previewTimeRef.current = safeStart;
    setPreviewMuted(Boolean(muted));
    setPreviewVideoId(nextVideoId);
    setPreviewNonce((value) => value + 1);
    setIsPlaying(true);
  };

  const sendPreviewCommand = (func, args = []) => {
    const iframeWindow = previewIframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    iframeWindow.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args,
      }),
      "*"
    );
  };

  const mutePreviewIframe = () => {
    sendPreviewCommand("setVolume", [0]);
    sendPreviewCommand("mute");
  };

  const unmutePreviewIframe = () => {
    setPreviewMuted(false);
    sendPreviewCommand("unMute");
    sendPreviewCommand("setVolume", [100]);
  };

  const getAudioPair = (source) => {
    const primary = source === "voc" ? vocAudioRef.current : karAudioRef.current;
    const secondary = source === "voc" ? karAudioRef.current : vocAudioRef.current;
    return { primary, secondary };
  };

  const applySoloMode = () => {
    if (!karAudioRef.current || !vocAudioRef.current) return;

    if (soloSourceRef.current === "kar") {
      karAudioRef.current.muted = false;
      vocAudioRef.current.muted = true;
      return;
    }

    if (soloSourceRef.current === "voc") {
      karAudioRef.current.muted = true;
      vocAudioRef.current.muted = false;
      return;
    }

    karAudioRef.current.muted = false;
    vocAudioRef.current.muted = false;
  };

  const playSynced = (source, startAt = null) => {
    if (isSyncingAudioRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary) return;
    isSyncingAudioRef.current = true;
    const t = startAt !== null ? startAt : (primary.currentTime || 0);
    primary.currentTime = t;
    if (secondary) secondary.currentTime = t;
    primary.muted = false;
    if (secondary) secondary.muted = false;

    applySoloMode();

    const plays = [primary.play()];
    if (secondary && secondary.src) plays.push(secondary.play());
    Promise.allSettled(plays).then(() => {
      isSyncingAudioRef.current = false;
      setIsPlaying(true);
      sendPreviewCommand("playVideo");
    });
  };

  const pauseSynced = () => {
    karAudioRef.current?.pause();
    vocAudioRef.current?.pause();
    sendPreviewCommand("pauseVideo");
    setIsPlaying(false);
  };

  const seekSynced = (source) => {
    if (isSyncingAudioRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary || !secondary) return;
    isSyncingAudioRef.current = true;
    secondary.currentTime = primary.currentTime || 0;
    isSyncingAudioRef.current = false;
  };

  const driftSync = (source) => {
    if (isSyncingAudioRef.current) return;
    const { primary, secondary } = getAudioPair(source);
    if (!primary || !secondary) return;
    const drift = Math.abs((secondary.currentTime || 0) - (primary.currentTime || 0));
    if (drift < 0.25) return;
    isSyncingAudioRef.current = true;
    secondary.currentTime = primary.currentTime || 0;
    isSyncingAudioRef.current = false;
  };

  const promptCreateAction = () => {
    setShowCreateHint(true);
    if (createHintTimerRef.current) {
      window.clearTimeout(createHintTimerRef.current);
    }

    createHintTimerRef.current = window.setTimeout(() => {
      setShowCreateHint(false);
      createHintTimerRef.current = null;
    }, 2400);

    if (canCreate && createButtonRef.current) {
      createButtonRef.current.focus();
      createButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const readCurrentTime = () => {
    if (ytPlayerRef.current?.getCurrentTime) {
      const time = Number(ytPlayerRef.current.getCurrentTime());
      return Number.isFinite(time) ? time : sharedTimeRef.current;
    }

    const ref = activeSource === "voc" ? vocAudioRef.current : karAudioRef.current;
    if (ref) {
      return Number.isFinite(ref.currentTime) ? ref.currentTime : sharedTimeRef.current;
    }

    return sharedTimeRef.current;
  };

  const pauseCurrent = () => {
    if (activeSource === "mix" && ytPlayerRef.current?.pauseVideo) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
      return;
    }

    karAudioRef.current?.pause();
    vocAudioRef.current?.pause();
    sendPreviewCommand("pauseVideo");
    setIsPlaying(false);
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

    if ((source === "kar" || source === "voc") && !karAudioRef.current) {
      return;
    }

    updateSyncPosition(0);

    pauseCurrent();

    setActiveExampleIndex(songIndex);
    setActiveSource(source);

    if (source === "mix") {
      soloSourceRef.current = null;
      setSoloSource(null);
      const nextVideoId = extractVideoId(song.youtube);
      autoplayPreview(nextVideoId);
      karAudioRef.current?.pause();
      vocAudioRef.current?.pause();
      setIsPlaying(true);
    } else if (karAudioRef.current && vocAudioRef.current) {
      soloSourceRef.current = source;
      setSoloSource(source);
      karAudioRef.current.src = song.karaoke;
      vocAudioRef.current.src = song.vocals;
      playSynced(source, 0);
    }

    pendingActionRef.current = null;
  };

  const handleExamplePlay = (songIndex, source) => {
    // Swap kar↔voc on same song without restarting playback.
    if (
      songIndex === activeExampleIndex &&
      (source === "kar" || source === "voc") &&
      (activeSource === "kar" || activeSource === "voc")
    ) {
      soloSourceRef.current = source;
      setSoloSource(source);
      setActiveSource(source);
      applySoloMode();
      return;
    }

    if (source === "kar" || source === "voc") {
      const nextVideoId = extractVideoId(EXAMPLE_SONGS[songIndex]?.youtube);
      autoplayPreview(nextVideoId, 0, true);
    }

    if (source === "mix") {
      const isSameMixSelection =
        songIndex === activeExampleIndex && activeSource === "mix";

      if (isSameMixSelection) {
        togglePlayPause();
        return;
      }

      unmutePreviewIframe();
      pauseCurrent();
      setActiveExampleIndex(songIndex);
      setActiveSource("mix");
      const mixVideoId = extractVideoId(EXAMPLE_SONGS[songIndex]?.youtube);
      autoplayPreview(mixVideoId);
      return;
    }

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
      if (ytPlayerRef.current?.getCurrentTime) {
        const t = Number(ytPlayerRef.current.getCurrentTime());
        const d = Number(ytPlayerRef.current.getDuration?.());
        if (Number.isFinite(d) && d > 0) {
          updateSyncDuration(d);
        }
        if (Number.isFinite(t)) {
          updateSyncPosition(t);
        }
      } else {
        const primaryAudio = activeSource === "voc" ? vocAudioRef.current : karAudioRef.current;
        if (primaryAudio) {
          const t = primaryAudio.currentTime;
          if (Number.isFinite(t)) updateSyncPosition(t);
          if (Number.isFinite(primaryAudio.duration) && primaryAudio.duration > 0) {
            updateSyncDuration(primaryAudio.duration);
          }
          // YT time sync is handled only on play/pause/seek events, not here
        } else {
          updateSyncPosition(sharedTimeRef.current);
        }
      }
    }, 500);

    return () => {
      window.clearInterval(tick);
    };
  }, [activeSource]);

  const onAudioTimeUpdate = (source) => {
    if (activeSource === "mix") return;
    const ref = source === "voc" ? vocAudioRef.current : karAudioRef.current;
    if (ref && activeSource === source) {
      updateSyncPosition(ref.currentTime);
      if (Number.isFinite(ref.duration) && ref.duration > 0) {
        updateSyncDuration(ref.duration);
      }
      driftSync(source);
    }
  };

  const onAudioLoadedMetadata = (source) => {
    const ref = source === "voc" ? vocAudioRef.current : karAudioRef.current;
    if (ref && Number.isFinite(ref.duration) && ref.duration > 0) {
      if (activeSource === source) updateSyncDuration(ref.duration);
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

      const mappedExamples = EXAMPLE_SONGS
        .map((song, index) => ({
          id: `fallback-${index}-${song.youtube}`,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          youtubeUrl: song.youtube,
        }));

      const matchedFallbackSongs = mappedExamples
        .filter((song) => {
          const haystack = `${song.title} ${song.artist}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        })
        .slice(0, 5);

      const fallbackSongs = matchedFallbackSongs.length > 0
        ? matchedFallbackSongs
        : mappedExamples.slice(0, 5);

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
        const finalResults = nextResults.length > 0 ? nextResults : fallbackSongs;
        setSongSearchResults(finalResults);
        setShowSongDropdown(true);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setSongSearchResults(fallbackSongs);
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
      setPreviewVideoId("");
      setInputSongTitle("");
      setInputSongArtist("");
      setInputSongDuration("");
      setInputKarUrl("");
      setInputVocUrl("");
      setLoadingInputLinks(false);
      return;
    }

    let cancelled = false;

    const readTitle = async () => {
      let titleValue = `YouTube ${videoId}`;
      let artistValue = "";
      let durationValue = "";

      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          if (!cancelled) {
            setInputSongTitle(titleValue);
            setInputSongArtist(artistValue);
            setInputSongDuration(durationValue);
          }
          return;
        }

        const data = await response.json();
        titleValue = data?.title || titleValue;
        artistValue = data?.author_name || "";

        try {
          const listResponse = await fetch("/api/youtube/get-song-list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: titleValue, artist: "", genre: "" }),
            cache: "no-store",
          });

          if (listResponse.ok) {
            const listData = await listResponse.json();
            const songs = Array.isArray(listData?.songs) ? listData.songs : [];
            const matched = songs.find((song) => extractVideoId(song?.youtubeUrl || "") === videoId);
            if (matched) {
              artistValue = matched.artist || artistValue;
              durationValue = matched.duration || "";
            }
          }
        } catch {
          // Keep oEmbed fallback values.
        }

        if (!cancelled) {
          setInputSongTitle(titleValue);
          setInputSongArtist(artistValue);
          setInputSongDuration(durationValue);
        }
      } catch {
        if (!cancelled) {
          setInputSongTitle(titleValue);
          setInputSongArtist(artistValue);
          setInputSongDuration(durationValue);
        }
      }
    };

    readTitle();

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    return () => {
      if (createHintTimerRef.current) {
        window.clearTimeout(createHintTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoId) {
      setInputKarUrl("");
      setInputVocUrl("");
      setLoadingInputLinks(false);
      setCdnFilesReady(false);
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
          setCdnFilesReady(Boolean(kar && voc));
        }
      } catch (error) {
        if (!cancelled && error?.name !== "AbortError") {
          setInputKarUrl("");
          setInputVocUrl("");
          setCdnFilesReady(false);
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

  useEffect(() => {
    if (!queuedVideoId) {
      setIsInPendingQueue(false);
      return;
    }

    const checkPendingQueue = async () => {
      try {
        const response = await fetch("/api/pending");
        const data = await response.json();
        const pending = Array.isArray(data?.pending) ? data.pending : [];
        const found = pending.some((item) => item.videoId === queuedVideoId);
        setIsInPendingQueue(found);
      } catch {
        setIsInPendingQueue(false);
      }
    };

    checkPendingQueue();
  }, [queuedVideoId]);

  const handleInputRowPlay = (source) => {
    if (!videoId) return;

    if (source === "voc") {
      mutePreviewIframe();
      promptCreateAction();
    }

    if (source === "kar") {
      promptCreateAction();
    }

    const sourceToPlay = source;

    if (source === "kar" || source === "voc") {
      autoplayPreview(videoId, 0, true);
    }

    if (activeExampleIndex === INPUT_ROW_INDEX && activeSource === sourceToPlay) {
      togglePlayPause();
      return;
    }

    updateSyncPosition(0);
    pauseCurrent();

    setActiveExampleIndex(INPUT_ROW_INDEX);
    setActiveSource(sourceToPlay);

    if (sourceToPlay === "mix") {
      soloSourceRef.current = null;
      setSoloSource(null);
      unmutePreviewIframe();
      autoplayPreview(videoId);
      return;
    }

    // If both CDN files exist, play them synced
    if (inputKarUrl && inputVocUrl && karAudioRef.current && vocAudioRef.current) {
      soloSourceRef.current = sourceToPlay;
      setSoloSource(sourceToPlay);
      karAudioRef.current.src = inputKarUrl;
      vocAudioRef.current.src = inputVocUrl;
      playSynced(sourceToPlay, 0);
      return;
    }

    const nextSrc = sourceToPlay === "kar" ? inputKarUrl : inputVocUrl;
    if (!nextSrc) {
      setIsPlaying(false);
      return;
    }
    if (karAudioRef.current) {
      karAudioRef.current.src = nextSrc;
      karAudioRef.current.currentTime = 0;
      karAudioRef.current.muted = false;
      karAudioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSongPick = (song) => {
    const nextUrl = String(song?.youtubeUrl || "");
    const nextVideoId = extractVideoId(nextUrl);

    const nextDisplay = [String(song?.title || "").trim(), String(song?.duration || "").trim()]
      .filter(Boolean)
      .join(" / ");

    setYoutubeUrl(nextUrl);
    setYoutubeDisplayValue(nextDisplay || nextUrl);
    if (nextVideoId) {
      pauseCurrent();
    }
    setShowSongDropdown(false);
    setSongSearchResults([]);
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
      sendPreviewCommand("seekTo", [next, true]);
      return;
    }

    if (karAudioRef.current) karAudioRef.current.currentTime = next;
    if (vocAudioRef.current) vocAudioRef.current.currentTime = next;
    sendPreviewCommand("seekTo", [next, true]);
  };

  const selectSyncChannel = (source) => {
    if (source !== "kar" && source !== "voc") return;
    const t = readCurrentTime();
    const shouldKeepPlaying = isPlaying;
    const nextSolo = soloSource === source ? null : source;
    soloSourceRef.current = nextSolo;
    setSoloSource(nextSolo);
    setActiveSource(source);
    mutePreviewIframe();

    if (karAudioRef.current) karAudioRef.current.currentTime = t;
    if (vocAudioRef.current) vocAudioRef.current.currentTime = t;

    if (shouldKeepPlaying) {
      playSynced(source, t);
      return;
    }

    applySoloMode();
  };

  const selectMixChannel = () => {
    soloSourceRef.current = null;
    setSoloSource(null);
    applySoloMode();
  };

  const togglePlayPause = () => {
    if (activeSource === "mix") {
      if (isPlaying) {
        sendPreviewCommand("pauseVideo");
        setIsPlaying(false);
      } else {
        unmutePreviewIframe();
        sendPreviewCommand("playVideo");
        setIsPlaying(true);
      }
      return;
    }

    if (isPlaying) {
      pauseSynced();
      return;
    }
    playSynced(activeSource);
  };

  const createKaraoke = async () => {
    if (!videoId || !hasValidPhone) {
      setStatus({
        type: "error",
        message: "Please enter a valid phone number and YouTube link.",
      });
      return;
    }

    setIsCreating(true);
    setStatus({ type: "idle", message: "" });

    try {
      const waResponse = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneAreaCode,
          localNumber: phoneNumber,
          phoneNumber: normalizedPhone,
          youtubeUrl,
          videoId,
          lang,
        }),
      });

      const waData = await waResponse.json();
      if (!waResponse.ok) {
        throw new Error(waData?.error || "Could not send WhatsApp request");
      }

      const response = await fetch("/api/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([
          {
            videoId,
            title: inputSongTitle || `YouTube ${videoId}`,
            duration: activeExample?.duration || "N/A",
            meta: {
              fromPhone: `972${normalizedPhone.slice(1)}`,
              userLang: lang === "he" ? "HE" : "EN",
            },
          },
        ]),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create karaoke request");
      }

      setIsInPendingQueue(true);
      setQueuedVideoId(data.videoId || videoId);
      setSongTitle(data?.entry?.title || inputSongTitle || `YouTube ${videoId}`);

      setStatus({
        type: "success",
        message: "Karaoke request created and WhatsApp sent. Continue to payment.",
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
    ? `${returnUrlBase}?videoId=${encodeURIComponent(queuedVideoId)}&phone=${encodeURIComponent(normalizedPhone)}&title=${encodeURIComponent(songTitle)}`
    : returnUrlBase;

  const paymentIframeUrl = queuedVideoId
    ? `/payment?videoId=${encodeURIComponent(queuedVideoId)}&title=${encodeURIComponent(songTitle)}&phone=${encodeURIComponent(normalizedPhone)}&returnUrl=${encodeURIComponent(returnUrl)}&lang=${encodeURIComponent(lang)}`
    : null;

  const paymentNavigatedRef = useRef(false);
  useEffect(() => {
    if (!paymentIframeUrl) return;
    if (paymentNavigatedRef.current) return;
    paymentNavigatedRef.current = true;
    window.location.assign(paymentIframeUrl);
  }, [paymentIframeUrl]);

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
            onClick={() => switchLanguage("he")}
          >
            HE
          </button>
          <button
            type="button"
            className={`lang-btn ${lang === "en" ? "is-active" : ""}`}
            onClick={() => switchLanguage("en")}
          >
            EN
          </button>
        </div>

        <img className="brand-logo" src="/youkar-logo.png" alt="YouKar logo" />

        <h1>{ui.headline}</h1>
        <p className="lead">{ui.lead}</p>

        <form className="request-form" onSubmit={submitCreate} dir={lang === "he" ? "rtl" : "ltr"}>
          <label htmlFor="youtube" className="youtube-step-label">{ui.step1}</label>
          <div className="search-input-wrap">
            <input
              id="youtube"
              type="text"
              placeholder={ui.searchPlaceholder}
              value={youtubeDisplayValue || youtubeUrl}
              onChange={(e) => {
                const nextUrl = e.target.value;
                const nextVideoId = extractVideoId(nextUrl);

                setYoutubeDisplayValue("");
                setYoutubeUrl(nextUrl);
                if (nextVideoId) {
                  pauseCurrent();
                }
                setQueuedVideoId("");
                setStatus({ type: "idle", message: "" });
              }}
              required
            />

            {youtubeUrl ? (
              <button
                type="button"
                className="clear-youtube-btn"
                aria-label="Clear YouTube input"
                title="Clear"
                onClick={() => {
                  setYoutubeDisplayValue("");
                  setYoutubeUrl("");
                  setShowSongDropdown(false);
                  setSongSearchResults([]);
                  setQueuedVideoId("");
                  setStatus({ type: "idle", message: "" });
                }}
              >
                ×
              </button>
            ) : null}

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

          <div className="wa-row" dir="ltr">
            <span className="wa-row-icon" aria-hidden="true">WA</span>
            <select
              className="wa-area-code"
              value={phoneAreaCode}
              onChange={(e) => {
                setPhoneAreaCode(e.target.value);
                setStatus({ type: "idle", message: "" });
              }}
              aria-label="Area code"
            >
              <option value="050">050</option>
              <option value="051">051</option>
              <option value="052">052</option>
              <option value="053">053</option>
              <option value="054">054</option>
              <option value="055">055</option>
              <option value="056">056</option>
              <option value="057">057</option>
              <option value="058">058</option>
            </select>
            <input
              className="wa-local-number"
              type="tel"
              inputMode="numeric"
              placeholder="7 digits"
              maxLength="7"
              value={phoneNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 7);
                setPhoneNumber(val);
                setStatus({ type: "idle", message: "" });
              }}
              aria-label={ui.phonePlaceholder}
            />
          </div>

          {phoneNumber && !hasValidPhone ? (
            <p className="field-hint error">{ui.phoneInvalid}</p>
          ) : null}

          <div className={`create-cta-wrap ${showCreateHint ? "is-aimed" : ""}`}>
            {showCreateHint ? (
              <p className="create-cta-hint" aria-live="polite">
                -&gt; {ui.create}
              </p>
            ) : null}
            {cdnFilesReady && videoId && !queuedVideoId ? (
              <div className="already-karaoke-banner">
                <p className="already-karaoke-msg">✅ {ui.alreadyHasKaraoke}</p>
                <button
                  type="button"
                  className="primary-cta is-highlight"
                  onClick={() => {
                    setQueuedVideoId(videoId);
                    setSongTitle(inputSongTitle || `YouTube ${videoId}`);
                    setStatus({ type: "success", message: ui.alreadyHasKaraokeAction });
                  }}
                >
                  {ui.alreadyHasKaraokeAction}
                </button>
              </div>
            ) : (
              <button
                ref={createButtonRef}
                type="submit"
                disabled={!canCreate || isCreating}
                className={canCreate ? "primary-cta create-cta-button is-highlight" : "primary-cta create-cta-button"}
              >
                {isCreating ? ui.creating : ui.create}
              </button>
            )}
          </div>
        </form>

        {paymentIframeUrl ? (
          <p className="field-hint">{lang === "he" ? "מעביר לעמוד תשלום..." : "Redirecting to payment page..."}</p>
        ) : null}

        {currentPreviewVideoId ? (
          <div className="preview-wrap">
            <p className="preview-label">{ui.clipPreview}</p>
            <iframe
              ref={previewIframeRef}
              key={`${currentPreviewVideoId}-${previewNonce}`}
              title="YouTube preview"
              src={`https://www.youtube-nocookie.com/embed/${currentPreviewVideoId}?autoplay=${previewNonce > 0 ? 1 : 0}&controls=0&playsinline=1&rel=0&playlist=${currentPreviewVideoId}&start=${Math.max(0, Math.floor(previewTimeRef.current || 0))}&mute=${previewMuted ? 1 : 0}&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />

            <div className="sync-controls" dir="ltr">
              <div className="sync-source-icons" role="group" aria-label="Audio channels">
                <button
                  type="button"
                  className={`source-icon-btn mix-icon ${soloSource === null ? "is-active" : ""}`}
                  onClick={selectMixChannel}
                  aria-label={ui.colMix}
                  title={ui.colMix}
                >
                  🔊
                </button>
              </div>
              <button
                type="button"
                className="sync-play-btn"
                onClick={togglePlayPause}
              >
                {isPlaying ? ui.pause : ui.play}
              </button>
              <input
                className="sync-slider"
                type="range"
                min="0"
                max={Math.max(0, syncDuration)}
                step="0.1"
                value={Math.min(syncSeconds, Math.max(0, syncDuration))}
                onChange={onSyncSeek}
                aria-label={ui.syncTime}
              />
              <p className="sync-time">{syncClock}</p>
            </div>

            <div className="download-links hidden-main-audio-players">
              <div className="download-row">
                <span className="download-label">🎵 {ui.colKar}</span>
                <div className="download-actions">
                  <audio
                    ref={karAudioRef}
                    controls
                    src={activeExample?.karaoke || ""}
                    className="inline-audio"
                    preload="none"
                    onPlay={() => playSynced("kar")}
                    onPause={() => pauseSynced()}
                    onSeeking={() => seekSynced("kar")}
                    onTimeUpdate={() => onAudioTimeUpdate("kar")}
                    onLoadedMetadata={() => onAudioLoadedMetadata("kar")}
                    onRateChange={() => {
                      if (vocAudioRef.current && karAudioRef.current && !isSyncingAudioRef.current)
                        vocAudioRef.current.playbackRate = karAudioRef.current.playbackRate;
                    }}
                    onEnded={() => pauseSynced()}
                  />
                </div>
              </div>

              <div className="download-row">
                <span className="download-label">🎤 {ui.colVoc}</span>
                <div className="download-actions">
                  <audio
                    ref={vocAudioRef}
                    controls
                    src={activeExample?.vocals || ""}
                    className="inline-audio"
                    preload="none"
                    onPlay={() => playSynced("voc")}
                    onPause={() => pauseSynced()}
                    onSeeking={() => seekSynced("voc")}
                    onTimeUpdate={() => onAudioTimeUpdate("voc")}
                    onLoadedMetadata={() => onAudioLoadedMetadata("voc")}
                    onRateChange={() => {
                      if (karAudioRef.current && vocAudioRef.current && !isSyncingAudioRef.current)
                        karAudioRef.current.playbackRate = vocAudioRef.current.playbackRate;
                    }}
                    onEnded={() => pauseSynced()}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="examples-panel">
          <h2>{ui.examplesTitle}</h2>
          <div className="examples-table-wrap">
            <table className="examples-table">
              <thead>
                <tr>
                  <th>{ui.colTitle}</th>
                  <th>{ui.colMix}</th>
                  <th>{ui.colKar}</th>
                  <th>{ui.colVoc}</th>
                </tr>
              </thead>
              <tbody>
                {videoId && inputSongTitle ? (
                  <tr className="input-song-row">
                    <td>
                      <button
                        type="button"
                        className="mini-btn yt-btn"
                        onClick={() => handleInputRowPlay("mix")}
                        title="Play input YouTube mix"
                      >
                        {inputSongTitle}
                      </button>
                    </td>
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
                        {ui.colMix}
                      </button>
                    </td>
                    <td>
                      <span className="examples-cell-muted">-</span>
                    </td>
                    <td>
                      <span className="examples-cell-muted">-</span>
                    </td>
                  </tr>
                ) : null}
                {EXAMPLE_SONGS.map((song, idx) => (
                    <tr
                      key={song.youtube}
                      className={idx === activeExampleIndex ? "is-active-row" : ""}
                    >
                    <td>
                      <button
                        type="button"
                        className="mini-btn yt-btn"
                        onClick={() => handleExamplePlay(idx, "mix")}
                        title="Play YouTube mix (original track)"
                      >
                        {song.title}
                      </button>
                    </td>
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
                        {ui.colMix}
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
                        {ui.colKar}
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
                        {ui.colVoc}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mini-player-wrap">
            <div className="mini-player hidden-player" aria-hidden="true">
              <div ref={ytHostRef} />
            </div>
          </div>
        </div>

        {status.type !== "idle" ? (
          <p className={`result ${status.type}`}>{status.message}</p>
        ) : null}
      </section>
    </main>
  );
}
