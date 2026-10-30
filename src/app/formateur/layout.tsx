import { redirect } from "next/navigation";
import { TrainerDashboardShell } from "@/components/formateur/trainer-dashboard-shell";
import { getAuthenticatedUser } from "@/lib/backend-auth";

export const instant = false;

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const response = await getAuthenticatedUser();
  if (response.status === 401 || response.status === 403) {
    redirect("/admin/login");
  }
  if (!response.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p role="alert" className="max-w-md rounded-xl border bg-card p-5 text-sm">
          Impossible de vérifier la session. Vérifie que le serveur fonctionne,
          puis recharge la page.
        </p>
      </main>
    );
  }

  const user: unknown = await response.json();
  if (
    !user ||
    typeof user !== "object" ||
    !("role" in user) ||
    user.role !== "FORMATEUR"
  ) {
    redirect("/admin/login");
  }

  const name =
    "name" in user && typeof user.name === "string" && user.name.trim()
      ? user.name
      : "Formateur";
  const email =
    "email" in user && typeof user.email === "string" ? user.email : "";

  return (
    <TrainerDashboardShell name={name} email={email}>
      {children}
    </TrainerDashboardShell>
  );
}
