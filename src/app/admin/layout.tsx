// Layout racine admin — neutre, les sous-groupes gèrent leur propre layout
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
