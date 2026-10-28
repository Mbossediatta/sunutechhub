import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const backendUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  let response: Response;

  try {
    response = await fetch(
      `${backendUrl.replace(/\/+$/, "")}/webhooks/paytech`,
      {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "application/json",
        },
        body: await request.text(),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch {
    return NextResponse.json(
      { message: "Impossible de transmettre la notification PayTech." },
      { status: 503 },
    );
  }

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
