import type { Metadata } from "next";
import { Bricolage_Grotesque, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomNav } from "@/components/layout/bottom-nav";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Sunu Tech Hub", template: "%s — Sunu Tech Hub" },
  description: "La communauté informatique du Sénégal. Apprendre, partager, construire ensemble.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning
      className={`${bricolage.variable} ${sourceSans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1 pb-20 md:pb-0">
              {children}
            </main>
            <SiteFooter />
            <BottomNav />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
