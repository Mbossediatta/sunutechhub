import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/tips/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json().catch(() => null);
      return NextResponse.json(payload, { status: response.status });
    }
    return NextResponse.json(
      { message: "La réponse du service des astuces est invalide." },
      { status: 502 },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le service des astuces." },
      { status: 503 },
    );
  }
}
