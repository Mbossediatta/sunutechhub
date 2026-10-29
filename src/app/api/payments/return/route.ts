import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const search = new URL(request.url).search;
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/payments/return${search}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    const result: unknown = await response.json().catch(() => null);
    return NextResponse.json(result, {
      status: response.status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      { message: "Impossible de vérifier le paiement pour le moment." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
