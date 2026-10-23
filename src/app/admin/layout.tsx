import { AppShell } from "@/components/app-shell";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Painel", exact: true },
  { href: "/admin/limpezas", label: "Limpezas" },
  { href: "/admin/manutencoes", label: "Manutenções" },
  { href: "/admin/problemas", label: "Problemas" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/checklist", label: "Checklist" },
  { href: "/admin/imoveis", label: "Imóveis" },
  { href: "/admin/equipe", label: "Equipe" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireAdmin();
  return (
    <AppShell nav={NAV} userName={profile.full_name}>
      {children}
    </AppShell>
  );
}
