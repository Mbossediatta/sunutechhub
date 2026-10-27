import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

const STATE_COOKIE_NAME = "sth_google_oauth_state";

function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function googleErrorCode(payload: unknown) {
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message.toLowerCase()
      : "";
  return message.includes("configuration") || message.includes("client id")
    ? "configuration"
    : "indisponible";
}

export async function GET() {
  const state = randomBytes(32).toString("base64url");
  let response: Response;
  try {
    response = await fetch(
      `${backendUrl("/auth/google/url")}?state=${encodeURIComponent(state)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
  } catch {
    return NextResponse.redirect(
      new URL(
        "/connexion?google=indisponible",
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      ),
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    !("authorizationUrl" in result) ||
    typeof result.authorizationUrl !== "string"
  ) {
    return NextResponse.redirect(
      new URL(
        `/connexion?google=${googleErrorCode(result)}`,
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      ),
    );
  }

  let authorizationUrl: URL;
  try {
    authorizationUrl = new URL(result.authorizationUrl);
  } catch {
    return NextResponse.redirect(
      new URL(
        "/connexion?google=configuration",
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      ),
    );
  }
  if (
    authorizationUrl.protocol !== "https:" ||
    authorizationUrl.hostname !== "accounts.google.com"
  ) {
    return NextResponse.redirect(
      new URL(
        "/connexion?google=configuration",
        process.env.FRONTEND_URL ?? "http://localhost:3000",
      ),
    );
  }

  const redirect = NextResponse.redirect(authorizationUrl);
  redirect.cookies.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google/callback",
    maxAge: 10 * 60,
  });
  return redirect;
}
