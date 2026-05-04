"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const upayAction = "https://app.upay.co.il/API6/clientsecure/redirectpage.php";

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const queuedVideoId = searchParams.get("videoId") || "";
  const songTitle = searchParams.get("title") || "";
  const phoneNumber = searchParams.get("phone") || "";
  const returnUrl = searchParams.get("returnUrl") || "https://youkar.vercel.app/after-payment";
  
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [status, setStatus] = useState("pending");

  useEffect(() => {
    if (!queuedVideoId) {
      setStatus("error");
      return;
    }

    const checkQueue = async () => {
      try {
        const response = await fetch("/api/pending");
        const data = await response.json();
        const pending = Array.isArray(data?.pending) ? data.pending : [];
        const found = pending.some((item) => item.videoId === queuedVideoId);
        
        if (found) {
          setPaymentEnabled(true);
          setStatus("ready");
        } else {
          setStatus("processing");
          // Check again in 2 seconds
          setTimeout(checkQueue, 2000);
        }
      } catch (err) {
        setStatus("error");
      }
    };

    checkQueue();
  }, [queuedVideoId]);

  if (status === "error") {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#ff6b6b" }}>
        <p>Error: Invalid payment parameters</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", backgroundColor: "transparent" }}>
      <h2 style={{ margin: "0 0 10px 0" }}>Complete Payment</h2>
      <p style={{ margin: "0 0 15px 0", color: "#c8d4ed" }}>You are paying for: {songTitle}</p>
      
      {status === "processing" && (
        <p style={{ margin: "0 0 15px 0", color: "#d2f2ff" }}>⏳ Verifying files and processing...</p>
      )}

      <a
        href={`https://paypage.takbull.co.il/3qBo9?phone=${encodeURIComponent(phoneNumber)}&product_name1=${encodeURIComponent(`${songTitle} KARAOKE + VOCALS files`)}&product_price1=5&product_quantity1=1`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block",
          marginRight: "10px",
          marginBottom: "10px",
          padding: "10px 20px",
          borderRadius: "8px",
          background: "rgba(44, 183, 255, 0.22)",
          color: "#fff",
          textDecoration: "none",
          fontWeight: "600",
          border: "1px solid rgba(124, 198, 255, 0.5)",
          opacity: paymentEnabled ? 1 : 0.5,
          pointerEvents: paymentEnabled ? "auto" : "none",
        }}
      >
        Pay with Takbull
      </a>

      <form
        name="upayform"
        action={upayAction}
        method="post"
        style={{ display: "inline-block" }}
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
          disabled={!paymentEnabled}
          style={{ opacity: paymentEnabled ? 1 : 0.5, cursor: paymentEnabled ? "pointer" : "not-allowed" }}
        />
      </form>
    </div>
  );
}
