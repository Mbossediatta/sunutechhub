import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = {
  params: Promise<{ id: string; contentId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { id, contentId } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/courses/${encodeURIComponent(id)}/progress/${encodeURIComponent(contentId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible d’enregistrer la progression du cours." },
      { status: 503 },
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  return NextResponse.json(payload, { status: response.status });
}
