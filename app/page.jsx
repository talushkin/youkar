"use client";

import { useMemo, useState } from "react";

const upayAction = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";
const returnUrlBase =
  process.env.NEXT_PUBLIC_RETURN_URL || "https://youkar.vercel.app/after-payment";

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

  const videoId = useMemo(() => extractVideoId(youtubeUrl), [youtubeUrl]);
  const canCreate = Boolean(videoId && !queuedVideoId);

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
      <section className="card">
        <img className="brand-logo" src="/youkar-logo.png" alt="YouKar logo" />

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
              setYoutubeUrl(e.target.value);
              setQueuedVideoId("");
              setStatus({ type: "idle", message: "" });
            }}
            required
          />

          {youtubeUrl && !videoId ? (
            <p className="field-hint error">Please use a valid YouTube URL.</p>
          ) : null}

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

          <button type="submit" disabled={!canCreate || isCreating}>
            {isCreating ? "Creating..." : "Create Karaoke"}
          </button>
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
              />
            </form>
          </div>
        ) : null}
      </section>
    </main>
  );
}
