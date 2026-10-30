import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get("reference")?.trim();
  if (!reference || !/^STH-[\da-f-]{36}$/i.test(reference)) {
    return NextResponse.json(
      { message: "La référence du paiement est invalide." },
      { status: 400 },
    );
  }

  const accessToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!accessToken) {
    return NextResponse.json(
      { message: "Connecte-toi pour vérifier ce paiement." },
      { status: 401 },
    );
  }

  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";

  try {
    const response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/payments/${encodeURIComponent(reference)}/status`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
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
