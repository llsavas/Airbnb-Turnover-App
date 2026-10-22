import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { NavLinks, type NavItem } from "@/components/nav-links";

export function AppShell({
  nav,
  userName,
  children,
}: {
  nav: NavItem[];
  userName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <Image src="/logo-mark.svg" alt="" width={34} height={25} unoptimized className="h-[25px] w-[34px]" />
            <span>
              AirComplex <span className="hidden sm:inline">Cleaning</span> 🧼
            </span>
          </Link>
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
