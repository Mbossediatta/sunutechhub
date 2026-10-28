import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { getAuthenticatedUser } from "@/lib/backend-auth";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s — Admin · Sunu Tech Hub" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted/30" />}>
      <AdminDashboardAccess>{children}</AdminDashboardAccess>
    </Suspense>
  );
}

async function AdminDashboardAccess({
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
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="font-bricolage text-xl font-bold">Administration temporairement indisponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Le serveur n’a pas pu vérifier votre session. Vérifiez que le backend est démarré, puis rechargez cette page.
          </p>
          <form className="mt-5">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Recharger
            </button>
          </form>
        </div>
      </main>
    );
  }

  const user: unknown = await response.json();
  if (
    !user ||
    typeof user !== "object" ||
    !("role" in user) ||
    user.role !== "ADMIN"
  ) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
