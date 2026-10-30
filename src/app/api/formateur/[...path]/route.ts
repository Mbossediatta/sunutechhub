import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";

type RouteContext = { params: Promise<{ path: string[] }> };

function backendUrl(path: string, search: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}${search}`;
}

async function proxyTrainerRequest(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const backendPath = `/trainer/${path.map(encodeURIComponent).join("/")}`;
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  let response: Response;
  try {
    response = await fetch(
      backendUrl(backendPath, new URL(request.url).search),
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
      {
        message:
          "Impossible de joindre le serveur. Vérifie que le backend est démarré, puis réessaie.",
      },
      { status: 503 },
    );
  }

  if (request.method !== "GET" && response.ok) {
    revalidateTag(PUBLIC_CACHE_TAGS.courses, { expire: 0 });
  }

  const payload: unknown = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyTrainerRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyTrainerRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyTrainerRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyTrainerRequest(request, context);
}
