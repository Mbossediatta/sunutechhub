// Pages auth — pas de bottom nav, pas de padding bas
// Le formulaire occupe exactement la hauteur restante après le header
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
