import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }
    const apiBase = process.env.BACKEND_BASE_URL || "https://be-tan-theta.vercel.app";
    const requestsKey = `tracks/${videoId}/requests.json`;
    const url = `${apiBase}/api/s3/object/${requestsKey}`;
    const headers = { Accept: "application/json" };
    const bearer = process.env.API_BEARER || "";
    if (bearer) headers.Authorization = `Bearer ${bearer}`;
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ count: 0, data: [] });
    }
    const arr = await res.json();
    if (Array.isArray(arr)) {
      return NextResponse.json({ count: arr.length, data: arr });
    }
    return NextResponse.json({ count: 0, data: [] });
  } catch (e) {
    return NextResponse.json({ count: 0, data: [] });
  }
}
