import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/backend-auth";

const SESSION_MAX_AGE_SECONDS = 15 * 60;

function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function pageUrl(path: string) {
  return new URL(path, process.env.FRONTEND_URL ?? "http://localhost:3000");
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token || !/^[\da-zA-Z_-]{32,128}$/.test(token)) {
    return NextResponse.redirect(pageUrl("/connexion?magic=invalid"));
  }

  const response = new NextResponse(
    `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="referrer" content="no-referrer">
    <title>Connexion — Sunu Tech Hub</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 28rem; margin: 15vh auto; padding: 1.5rem; text-align: center; color: #172033">
    <h1>Votre lien de connexion est prêt</h1>
    <p>Confirmez pour ouvrir votre session Sunu Tech Hub.</p>
    <form method="post">
      <input type="hidden" name="token" value="${token}">
      <button style="border: 0; border-radius: .75rem; background: #3155d9; color: white; padding: .85rem 1.25rem; font-size: 1rem; cursor: pointer" type="submit">Me connecter</button>
    </form>
  </body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
  return response;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = formData.get("token");
  if (typeof token !== "string" || !/^[\da-zA-Z_-]{32,128}$/.test(token)) {
    return NextResponse.redirect(pageUrl("/connexion?magic=invalid"));
  }

  let backendResponse: Response;
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");
    backendResponse = await fetch(backendUrl("/auth/magic-link/verify"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.redirect(pageUrl("/connexion?magic=unavailable"));
  }

  const result: unknown = await backendResponse.json().catch(() => null);
  if (
    !backendResponse.ok ||
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
    return NextResponse.redirect(pageUrl("/connexion?magic=invalid"));
  }

  const destination = result.user.role === "ADMIN" ? "/admin" : "/questions";
  const response = NextResponse.redirect(pageUrl(destination));
  response.cookies.set(AUTH_COOKIE_NAME, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
