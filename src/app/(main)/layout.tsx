import { SiteFooter } from "@/components/layout/site-footer";
import { MainShell } from "@/components/layout/main-shell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MainShell footer={<SiteFooter />}>{children}</MainShell>
  );
}
