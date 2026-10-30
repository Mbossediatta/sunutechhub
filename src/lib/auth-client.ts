interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "MEMBER" | "FORMATEUR" | "ADMIN";
  };
  welcomeEmailSent?: boolean;
  welcomeEmailQueued?: boolean;
}

class AuthRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly transportFailure = false,
  ) {
    super(message);
  }
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
    (user.role === "MEMBER" ||
      user.role === "FORMATEUR" ||
      user.role === "ADMIN") &&
    (!("welcomeEmailSent" in value) ||
      typeof value.welcomeEmailSent === "boolean") &&
    (!("welcomeEmailQueued" in value) ||
      typeof value.welcomeEmailQueued === "boolean")
  );
}

async function postAuthRequest(
  action: "login" | "register",
  values: {
    name?: string;
    email: string;
    password: string;
    interests?: string[];
    newsletterSubscribed?: boolean;
  },
) {
  let response: Response;
  try {
    response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
  } catch {
    throw new AuthRequestError(
      "Impossible de joindre le serveur. Réessaie dans un instant.",
      undefined,
      true,
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
    throw new AuthRequestError(message, response.status);
  }
  if (!isAuthResponse(result)) {
    throw new AuthRequestError("Réponse d’authentification invalide.");
  }
  return result;
}

async function recoverRegistrationSession(values: {
  name?: string;
  email: string;
  password: string;
  interests?: string[];
  newsletterSubscribed?: boolean;
}) {
  try {
    return await postAuthRequest("login", values);
  } catch {
    throw new Error(
      "La connexion au serveur a été interrompue pendant l’inscription. Si ton compte a été créé, connecte-toi avec ton adresse e-mail et ton mot de passe.",
    );
  }
}

export async function submitAuthForm(
  action: "login" | "register",
  values: {
    name?: string;
    email: string;
    password: string;
    interests?: string[];
    newsletterSubscribed?: boolean;
  },
): Promise<AuthResponse> {
  try {
    const result = await postAuthRequest(action, values);
    window.dispatchEvent(new Event("sth:auth-changed"));
    return result;
  } catch (authError) {
    if (action !== "register") throw authError;
    if (
      !(authError instanceof AuthRequestError) ||
      (!authError.transportFailure && (authError.status ?? 0) < 500)
    ) {
      throw authError;
    }
    const result = await recoverRegistrationSession(values);
    window.dispatchEvent(new Event("sth:auth-changed"));
    return result;
  }
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
