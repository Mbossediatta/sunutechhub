import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyCommunityRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  let response: Response;
  try {
    const encodedPath = path.map(encodeURIComponent).join("/");
    response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/${encodedPath}${new URL(request.url).search}`,
      {
        method: request.method,
        headers,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le serveur communautaire." },
      { status: 503 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  }
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: contentType ? { "Content-Type": contentType } : undefined,
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyCommunityRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyCommunityRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyCommunityRequest(request, context);
}
