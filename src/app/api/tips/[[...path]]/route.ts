import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";
import {
  PUBLIC_CACHE_CONTROL,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxyTipRequest(request: Request, context: RouteContext) {
  const { path = [] } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const publicList = request.method === "GET" && path.length === 0;
  const token = publicList
    ? undefined
    : (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/tips/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
      {
        method: request.method,
        headers,
        body,
        ...(publicList
          ? {
              next: {
                revalidate: 30,
                tags: [PUBLIC_CACHE_TAGS.tips],
              },
            }
          : { cache: "no-store" as const }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload: unknown = await response.json().catch(() => null);
      return NextResponse.json(payload, {
        status: response.status,
        headers:
          publicList && response.ok
            ? { "Cache-Control": PUBLIC_CACHE_CONTROL }
            : undefined,
      });
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

export async function GET(request: Request, context: RouteContext) {
  return proxyTipRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyTipRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyTipRequest(request, context);
}
