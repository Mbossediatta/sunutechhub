import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { status: "unhealthy" },
        { status: 503 },
      );
    }

    const result: unknown = await response.json().catch(() => null);
    if (
      !result ||
      typeof result !== "object" ||
      !("status" in result) ||
      result.status !== "ok"
    ) {
      return NextResponse.json(
        { status: "unhealthy" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json(
      { status: "unhealthy" },
      { status: 503 },
    );
  }
}
