import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <path d="M4 21V8l8-4 8 4v13M4 21h16M9 21v-4h6v4M8 11h2M14 11h2M8 14h2M14 14h2" />
    </svg>
  );
}

// Admins switch between their own panel and the cleaning team's app.
function ModeSwitch({ mode }: { mode: "admin" | "equipe" }) {
  const item = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-900"
    }`;
  return (
    <div className="flex rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
      <Link href="/admin" className={item(mode === "admin")} aria-current={mode === "admin" ? "page" : undefined}>
        <ClipboardIcon /> Admin
      </Link>
      <Link href="/limpezas" className={item(mode === "equipe")} aria-current={mode === "equipe" ? "page" : undefined}>
        <BuildingIcon /> Equipe
      </Link>
    </div>
  );
}

export function AppShell({
  nav,
  userName,
  mode,
  children,
}: {
  nav: NavItem[];
  userName: string;
  // Shown to admins only.
  mode?: "admin" | "equipe";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Image src="/logo-mark.svg" alt="" width={34} height={25} unoptimized className="h-[25px] w-[34px]" />
            <span className={mode ? "hidden sm:inline" : undefined}>
              AirComplex <span className="hidden sm:inline">Cleaning</span> 🧼
            </span>
          </Link>
          {mode && <ModeSwitch mode={mode} />}
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{userName}</span>
            <form action={signOut}>
              <button className="font-medium text-slate-600 hover:text-slate-900">Sair</button>
            </form>
          </div>
        </div>
        {nav.length > 1 && (
          <nav className="mx-auto max-w-5xl overflow-x-auto px-2">
            <NavLinks items={nav} />
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
