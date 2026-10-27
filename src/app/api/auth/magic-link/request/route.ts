import { NextResponse } from "next/server";

function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(backendUrl("/auth/magic-link/request"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
  return NextResponse.json(result, { status: response.status });
}
