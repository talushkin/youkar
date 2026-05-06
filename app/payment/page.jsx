"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const upayAction = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const iframeRef = useRef(null);
  const pollRef = useRef(null);

  const queuedVideoId = searchParams.get("videoId") || "";
  const songTitle = searchParams.get("title") || "";
  const returnUrl = searchParams.get("returnUrl") || `${typeof window !== "undefined" ? window.location.origin : "https://youkar.vercel.app"}/after-payment`;
  const appLang = (searchParams.get("lang") || "en").toLowerCase();
  const upayLang = appLang === "he" ? "HE" : "EN";
  const isHebrew = appLang === "he";
  const mainGradientBg = "radial-gradient(circle at 20% 20%, #1f4f85 0%, transparent 40%), radial-gradient(circle at 90% 0%, #712626 0%, transparent 30%), linear-gradient(135deg, #081329, #0e3256 45%, #102848)";

  const upayCheckoutUrl = useMemo(() => {
    const params = new URLSearchParams({
      email: "ipadtal@gmail.com",
      amount: "10",
      returnurl: returnUrl,
      ipnurl: "",
      paymentdetails: `שני קבצי סאונד ${queuedVideoId}`,
      maxpayments: "1",
      livesystem: "1",
      commissionreduction: "",
      createinvoiceandreceipt: "1",
      createinvoice: "0",
      createreceipt: "0",
      refername: "UPAY",
      lang: upayLang,
      currency: "NIS",
    });
    return `${upayAction}?${params.toString()}`;
  }, [queuedVideoId, returnUrl, upayLang]);

  const checkIframeLocation = useCallback(() => {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const href = iframe.contentWindow?.location?.href;
      if (href && href.includes("/after-payment")) {
        clearInterval(pollRef.current);
        const afterUrl = new URL(href);
        router.replace(`/after-payment${afterUrl.search}`);
      }
    } catch {
      // cross-origin frame — payment still in progress, ignore
    }
  }, [router]);

  useEffect(() => {
    pollRef.current = setInterval(checkIframeLocation, 500);
    return () => clearInterval(pollRef.current);
  }, [checkIframeLocation]);

  const handleClose = () => {
    router.back();
  };

  return (
    <div style={{ minHeight: "100vh", background: mainGradientBg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      {/* Modal overlay */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "16px",
      }}>
        <div style={{
          background: "#0e1f3d", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column",
          width: "100%", maxWidth: "520px", maxHeight: "90vh", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}>
          {/* Modal header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ color: "#c8d4ed", fontSize: "14px", fontWeight: 600 }}>
              {isHebrew ? "השלמת תשלום" : "Complete Payment"}
              {songTitle ? ` — ${songTitle}` : ""}
            </span>
            <button onClick={handleClose} style={{ background: "none", border: "none", color: "#c8d4ed", fontSize: "20px", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {/* UPay iframe */}
          <iframe
            ref={iframeRef}
            src={upayCheckoutUrl}
            title={isHebrew ? "תשלום UPay" : "UPay Payment"}
            style={{ flex: 1, width: "100%", border: "none", minHeight: "540px" }}
            allow="payment"
          />
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div style={{ padding: "20px", textAlign: "center" }}>Loading payment...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}
