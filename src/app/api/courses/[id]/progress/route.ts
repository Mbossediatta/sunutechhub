import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = { params: Promise<{ id: string }> };

async function proxyProgressRequest(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/courses/${encodeURIComponent(id)}/progress${new URL(request.url).search}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de charger la progression du cours." },
      { status: 503 },
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyProgressRequest(request, context);
}
