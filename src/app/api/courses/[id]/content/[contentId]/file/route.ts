import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

type RouteContext = {
  params: Promise<{ id: string; contentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  const { id, contentId } = await context.params;
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, "")}/courses/${encodeURIComponent(id)}/content/${encodeURIComponent(contentId)}/file`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(result, { status: response.status });
    }
    if (
      !result ||
      typeof result !== "object" ||
      !("url" in result) ||
      typeof result.url !== "string"
    ) {
      return NextResponse.json(
        { message: "Le lien du support est invalide." },
        { status: 502 },
      );
    }

    let downloadUrl: URL;
    try {
      downloadUrl = new URL(result.url);
    } catch {
      return NextResponse.json(
        { message: "Le lien du support est invalide." },
        { status: 502 },
      );
    }
    if (downloadUrl.protocol !== "https:") {
      return NextResponse.json(
        { message: "Le lien du support n’est pas sécurisé." },
        { status: 502 },
      );
    }

    return NextResponse.redirect(downloadUrl, 302);
  } catch {
    return NextResponse.json(
      { message: "Impossible de préparer le téléchargement du support." },
      { status: 503 },
    );
  }
}
