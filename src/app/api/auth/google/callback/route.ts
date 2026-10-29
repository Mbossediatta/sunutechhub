import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

const STATE_COOKIE_NAME = "sth_google_oauth_state";
const SESSION_MAX_AGE_SECONDS = 15 * 60;

function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function pageUrl(path: string) {
  return new URL(path, process.env.FRONTEND_URL ?? "http://localhost:3000");
}

function googleErrorCode(payload: unknown) {
  const message =
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
      ? payload.message.toLowerCase()
      : "";
  if (message.includes("client id") || message.includes("configuration")) {
    return "configuration";
  }
  if (message.includes("adresse de retour") || message.includes("uri")) {
    return "callback";
  }
  if (message.includes("expiré") || message.includes("déjà été utilisé")) {
    return "expired";
  }
  return "refuse";
}

export async function GET(request: NextRequest) {
  const stateCookie = request.cookies.get(STATE_COOKIE_NAME)?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const googleError = request.nextUrl.searchParams.get("error");

  const clearState = (response: NextResponse) => {
    response.cookies.set(STATE_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google/callback",
      maxAge: 0,
    });
    return response;
  };

  if (!stateCookie || !state || stateCookie !== state) {
    return clearState(
      NextResponse.redirect(pageUrl("/connexion?google=invalid")),
    );
  }
  if (googleError || !code) {
    return clearState(
      NextResponse.redirect(
        pageUrl(
          googleError === "access_denied"
            ? "/connexion?google=annule"
            : "/connexion?google=configuration",
        ),
      ),
    );
  }

  let backendResponse: Response;
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    backendResponse = await fetch(backendUrl("/auth/google/callback"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return clearState(
      NextResponse.redirect(pageUrl("/connexion?google=indisponible")),
    );
  }

  const result: unknown = await backendResponse.json().catch(() => null);
  if (!backendResponse.ok) {
    return clearState(
      NextResponse.redirect(
        pageUrl(`/connexion?google=${googleErrorCode(result)}`),
      ),
    );
  }
  if (
    !result ||
    typeof result !== "object" ||
    !("accessToken" in result) ||
    typeof result.accessToken !== "string" ||
    !("user" in result) ||
    !result.user ||
    typeof result.user !== "object" ||
    !("role" in result.user) ||
    (result.user.role !== "ADMIN" && result.user.role !== "MEMBER")
  ) {
    return clearState(
      NextResponse.redirect(pageUrl("/connexion?google=refuse")),
    );
  }

  const isNewAccount =
    "welcomeEmailSent" in result &&
    typeof result.welcomeEmailSent === "boolean";
  const destination = isNewAccount
    ? `/inscription?welcome=${result.welcomeEmailSent ? "envoye" : "non-envoye"}`
    : result.user.role === "ADMIN"
      ? "/admin"
      : "/questions";
  const response = clearState(NextResponse.redirect(pageUrl(destination)));
  response.cookies.set(AUTH_COOKIE_NAME, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
