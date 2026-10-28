import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Connecte-toi et inscris-toi au cours pour accéder à son contenu." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/courses/${encodeURIComponent(id)}/content`,
      {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Impossible de charger le contenu du cours. Réessaie." },
      { status: 503 },
    );
  }
}
