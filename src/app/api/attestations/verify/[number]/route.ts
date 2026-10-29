import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ number: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { number } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/attestations/verify/${encodeURIComponent(number)}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Impossible de vérifier cette attestation." },
      { status: 503 },
    );
  }
}
