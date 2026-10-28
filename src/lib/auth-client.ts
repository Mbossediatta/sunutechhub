interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "MEMBER" | "ADMIN";
  };
  welcomeEmailSent?: boolean;
}

function isAuthResponse(value: unknown): value is AuthResponse {
  if (
    !value ||
    typeof value !== "object" ||
    !("user" in value) ||
    !value.user
  ) {
    return false;
  }
  const user = value.user;
  return (
    typeof user === "object" &&
    "id" in user &&
    typeof user.id === "string" &&
    "name" in user &&
    typeof user.name === "string" &&
    "email" in user &&
    typeof user.email === "string" &&
    "role" in user &&
    (user.role === "MEMBER" || user.role === "ADMIN") &&
    (!("welcomeEmailSent" in value) ||
      typeof value.welcomeEmailSent === "boolean")
  );
}

export async function submitAuthForm(
  action: "login" | "register",
  values: {
    name?: string;
    email: string;
    password: string;
    interests?: string[];
  },
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Réessaie dans un instant.",
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Une erreur est survenue. Réessaie dans un instant.";
    throw new Error(message);
  }

  if (!isAuthResponse(result)) {
    throw new Error("Réponse d’authentification invalide.");
  }
  window.dispatchEvent(new Event("sth:auth-changed"));
  return result;
}

export async function requestMagicLink(email: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/auth/magic-link/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error(
      "Impossible de joindre le serveur. Réessaie dans un instant.",
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Impossible d’envoyer le lien de connexion.";
    throw new Error(message);
  }
  if (
    !result ||
    typeof result !== "object" ||
    !("message" in result) ||
    typeof result.message !== "string"
  ) {
    throw new Error("Réponse invalide du serveur.");
  }
  return result.message;
}
