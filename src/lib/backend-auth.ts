import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "sth_access_token";
const AUTH_COOKIE_MAX_AGE_SECONDS = 15 * 60;

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "MEMBER" | "ADMIN";
}

interface BackendAuthResult {
  accessToken: string;
  user: AuthUser;
  welcomeEmailSent?: boolean;
}

function isBackendAuthResult(value: unknown): value is BackendAuthResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  if (!result.user || typeof result.user !== "object") return false;
  const user = result.user as Record<string, unknown>;
  return (
    typeof result.accessToken === "string" &&
    (result.welcomeEmailSent === undefined ||
      typeof result.welcomeEmailSent === "boolean") &&
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    (user.role === "MEMBER" || user.role === "ADMIN")
  );
}

function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function apiErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = payload.message;
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(" ");
    }
  }
  return "Le service est momentanément indisponible.";
}

export async function authenticate(
  request: Request,
  action: "login" | "register",
  requiredRole?: AuthUser["role"],
) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Requête invalide." }, { status: 400 });
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(backendUrl(`/auth/${action}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      {
        message: "Impossible de joindre le serveur. Réessaie dans un instant.",
      },
      { status: 503 },
    );
  }

  const result: unknown = await backendResponse.json().catch(() => null);
  if (!backendResponse.ok) {
    return NextResponse.json(
      { message: apiErrorMessage(result) },
      { status: backendResponse.status },
    );
  }

  if (!isBackendAuthResult(result)) {
    return NextResponse.json(
      { message: "Réponse d’authentification invalide." },
      { status: 502 },
    );
  }

  if (requiredRole && result.user.role !== requiredRole) {
    return NextResponse.json(
      { message: "Accès réservé aux administrateurs." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    user: result.user,
    ...(action === "register"
      ? { welcomeEmailSent: result.welcomeEmailSent ?? false }
      : {}),
  });
  response.cookies.set(AUTH_COOKIE_NAME, result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function getAuthenticatedUser() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "Authentification requise." },
      { status: 401 },
    );
  }

  let response: Response;
  try {
    response = await fetch(backendUrl("/auth/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      {
        message: "Impossible de joindre le serveur. Réessaie dans un instant.",
      },
      { status: 503 },
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const nextResponse = NextResponse.json(
      { message: apiErrorMessage(result) },
      { status: response.status },
    );
    if (response.status === 401) {
      nextResponse.cookies.delete(AUTH_COOKIE_NAME);
    }
    return nextResponse;
  }
  return NextResponse.json(result);
}
