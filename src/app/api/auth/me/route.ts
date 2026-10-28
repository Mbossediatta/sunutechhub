import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthenticatedUser } from "@/lib/backend-auth";

export async function GET() {
  return getAuthenticatedUser();
}

export async function PATCH(request: Request) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ message: "Authentification requise." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/auth/me`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le serveur. Réessaie dans un instant." },
      { status: 503 },
    );
  }

  const result: unknown = await response.json().catch(() => null);
  const nextResponse = NextResponse.json(result, { status: response.status });
  if (response.status === 401) nextResponse.cookies.delete(AUTH_COOKIE_NAME);
  return nextResponse;
}
