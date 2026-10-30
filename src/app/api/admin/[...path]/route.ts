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

async function proxyAdminRequest(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const backendPath = `/admin/${path.map(encodeURIComponent).join("/")}`;
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Content-Type", "application/json");
    body = await request.text();
  }

  let response: Response | undefined;
  const attempts = request.method === "GET" ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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
      break;
    } catch {
      if (attempt === attempts - 1) {
        return NextResponse.json(
          {
            message:
              "Impossible de joindre le serveur. Vérifie que le backend est démarré, puis réessaie.",
          },
          { status: 503 },
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  if (!response) {
    return NextResponse.json(
      { message: "Aucune réponse du serveur. Réessaie dans un instant." },
      { status: 503 },
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (request.method !== "GET" && response.ok) {
    const changedPath = path.join("/");
    if (changedPath.startsWith("courses")) {
      revalidateTag(PUBLIC_CACHE_TAGS.courses, { expire: 0 });
    }
    if (changedPath.startsWith("tips")) {
      revalidateTag(PUBLIC_CACHE_TAGS.tips, { expire: 0 });
    }
    if (
      changedPath.startsWith("community/questions") ||
      changedPath.startsWith("questions")
    ) {
      revalidateTag(PUBLIC_CACHE_TAGS.questions, { expire: 0 });
    }
    if (changedPath.startsWith("events")) {
      revalidateTag(PUBLIC_CACHE_TAGS.events, { expire: 0 });
    }
    if (changedPath.startsWith("jobs")) {
      revalidateTag(PUBLIC_CACHE_TAGS.jobs, { expire: 0 });
    }
  }
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
  return proxyAdminRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyAdminRequest(request, context);
}
