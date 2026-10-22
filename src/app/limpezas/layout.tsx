import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function CleanerLayout({ children }: LayoutProps<"/limpezas">) {
  const profile = await requireUser();
  const nav = [
    { href: "/limpezas", label: "Minhas limpezas", exact: true },
    { href: "/limpezas/dicas", label: "Dicas nota 5 ★" },
    ...(profile.role === "admin" ? [{ href: "/admin", label: "Voltar ao painel" }] : []),
  ];
  return (
    <AppShell nav={nav} userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
