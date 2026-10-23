import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function CleanerLayout({ children }: LayoutProps<"/limpezas">) {
  const profile = await requireUser();
  const nav = [
    { href: "/limpezas", label: "Minhas limpezas", exact: true },
    { href: "/limpezas/dicas", label: "Dicas nota 5 ★" },
  ];
  return (
    <AppShell nav={nav} userName={profile.full_name} mode={profile.role === "admin" ? "equipe" : undefined}>
      {children}
    </AppShell>
  );
}
