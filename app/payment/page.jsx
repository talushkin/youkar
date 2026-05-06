"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";

const upayAction = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";

function PaymentPageContent() {
  const searchParams = useSearchParams();
  const hasOpenedRef = useRef(false);
  const queuedVideoId = searchParams.get("videoId") || "";
  const songTitle = searchParams.get("title") || "";
  const returnUrl = searchParams.get("returnUrl") || "https://youkar.vercel.app/after-payment";
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

  useEffect(() => {
    if (hasOpenedRef.current) return;
    hasOpenedRef.current = true;

    window.location.assign(upayCheckoutUrl);
  }, [upayCheckoutUrl]);

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: mainGradientBg }}>
      <h2 style={{ margin: "0 0 10px 0" }}>{isHebrew ? "השלמת תשלום" : "Complete Payment"}</h2>
      <p style={{ margin: "0 0 15px 0", color: "#c8d4ed" }}>
        {isHebrew ? "התשלום עבור:" : "You are paying for:"} {songTitle}
      </p>

      <p style={{ margin: 0, color: "#c8d4ed" }}>
        {isHebrew ? "מעביר לתשלום UPay..." : "Redirecting to UPay payment..."}
      </p>
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
