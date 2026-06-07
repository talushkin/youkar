import { NextResponse } from "next/server";

function normalizeWaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, text, title } = body;

    if (!to || !text) {
      return NextResponse.json({ error: "to and text are required" }, { status: 400 });
    }

    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const bearer = process.env.API_BEARER || "";
    const normalizedTo = normalizeWaPhone(to);

    if (!normalizedTo) {
      return NextResponse.json({ error: "Invalid 'to' phone number" }, { status: 400 });
    }

    const headers = { "Content-Type": "application/json" };
    if (bearer) headers.Authorization = `Bearer ${bearer}`;

    const backendPayload = {
      to: normalizedTo,
      from: "14155238886",
      title: title || "Your Karaoke Files",
      text,
    };

    const backendCall = {
      url: `${apiBase}/api/wa`,
      method: "POST",
      hasBearer: Boolean(bearer),
      headers: { "Content-Type": "application/json", hasAuthorization: Boolean(bearer) },
      body: backendPayload,
    };

    console.log("[api/wa][POST] Backend call", backendCall);

    const response = await fetch(backendCall.url, {
      method: "POST",
      headers,
      body: JSON.stringify(backendPayload),
      cache: "no-store",
    });

    const responseText = await response.text();
    let responseBody = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }

    const backendResponse = {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    };

    if (!response.ok) {
      console.error("[api/wa][POST] Backend error", {
        backendCall,
        backendResponse,
      });
      return NextResponse.json(
        {
          ok: false,
          error: `Backend WA failed: ${response.status}`,
          details: typeof responseBody === "string" ? responseBody : JSON.stringify(responseBody),
          backendCall,
          backendResponse,
        },
        { status: 502 }
      );
    }

    console.log("[api/wa][POST] Backend success", {
      backendCall,
      backendResponse,
    });

    return NextResponse.json({ ok: true, backendCall, backendResponse });
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
