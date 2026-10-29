import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyPaymentRequest(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Connecte-toi pour effectuer un paiement." },
      { status: 401 },
    );
  }
  const { path } = await context.params;
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
  const body = await request.text();
  if (body) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/payments/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`,
      {
        method: request.method,
        headers,
        body: body || undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le service de paiement." },
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
  return proxyPaymentRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyPaymentRequest(request, context);
}
