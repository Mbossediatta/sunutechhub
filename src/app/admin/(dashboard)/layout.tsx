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
  if (!response.ok) redirect("/admin/login");

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
