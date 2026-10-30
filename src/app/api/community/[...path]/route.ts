import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";
import {
  PUBLIC_CACHE_CONTROL,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache";

type RouteContext = { params: Promise<{ path: string[] }> };
const PUBLIC_LIST_TAGS: Record<string, string> = {
  events: PUBLIC_CACHE_TAGS.events,
  jobs: PUBLIC_CACHE_TAGS.jobs,
  questions: PUBLIC_CACHE_TAGS.questions,
  "showcase-projects": PUBLIC_CACHE_TAGS.projects,
};

async function proxyCommunityRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const publicList =
    request.method === "GET" && path.length === 1
      ? PUBLIC_LIST_TAGS[path[0]]
      : undefined;
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

  let response: Response;
  try {
    const encodedPath = path.map(encodeURIComponent).join("/");
    response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/${encodedPath}${new URL(request.url).search}`,
      {
        method: request.method,
        headers,
        body,
        ...(publicList
          ? {
              next: {
                revalidate: 30,
                tags: [publicList],
              },
            }
          : { cache: "no-store" as const }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (
      response.ok &&
      request.method !== "GET" &&
      path[0] &&
      PUBLIC_LIST_TAGS[path[0]]
    ) {
      revalidateTag(PUBLIC_LIST_TAGS[path[0]], { expire: 0 });
    }
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le serveur communautaire." },
      { status: 503 },
    );
  }

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

export async function PUT(request: Request, context: RouteContext) {
  return proxyCommunityRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyCommunityRequest(request, context);
}
