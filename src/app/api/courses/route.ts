import { NextResponse } from "next/server";
import {
  PUBLIC_CACHE_CONTROL,
  PUBLIC_CACHE_TAGS,
} from "@/lib/public-cache";

export async function GET() {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/courses`, {
      next: { revalidate: 30, tags: [PUBLIC_CACHE_TAGS.courses] },
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    return NextResponse.json(payload, {
      status: response.status,
      headers: response.ok
        ? { "Cache-Control": PUBLIC_CACHE_CONTROL }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { message: "Impossible de joindre le serveur des cours." },
      { status: 503 },
    );
  }
}
