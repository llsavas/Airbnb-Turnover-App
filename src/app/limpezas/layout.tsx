import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function CleanerLayout({ children }: LayoutProps<"/limpezas">) {
  const profile = await requireUser();
  const nav =
    profile.role === "admin"
      ? [
          { href: "/limpezas", label: "Minhas limpezas" },
          { href: "/admin", label: "Voltar ao painel" },
        ]
      : [];
  return (
    <AppShell nav={nav} userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
