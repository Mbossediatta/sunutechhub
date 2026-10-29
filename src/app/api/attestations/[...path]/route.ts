import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyAttestationRequest(
  request: Request,
  context: RouteContext,
) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/attestations/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(request.method === "POST"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(request.method === "POST" ? { body: await request.text() } : {}),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le service des attestations." },
      { status: 503 },
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  }
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      ...(response.headers.get("content-disposition")
        ? {
            "Content-Disposition": response.headers.get("content-disposition")!,
          }
        : {}),
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyAttestationRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyAttestationRequest(request, context);
}
