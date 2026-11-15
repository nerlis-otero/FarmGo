import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const backendUrl = (
      process.env.FARMGO_API_URL ??
      process.env.FARMFUTURE_API_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "https://farmgo-v9s1.onrender.com"
    ).replace(/\/+$/, "");

    const res = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          reply:
            "I'm temporarily having trouble connecting to the advisory service. Please try again in a moment.",
          in_scope: true,
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        reply:
          "Blueby is currently resting its roots. Please check back in a few seconds or review the crop plan recommendations on this page.",
        in_scope: true,
      },
      { status: 200 },
    );
  }
}
