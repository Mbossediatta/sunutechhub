import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/pricing`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le service de tarification." },
      { status: 503 },
    );
  }
}
