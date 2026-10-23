"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { saveBuildingSelection } from "@/app/building-actions";

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <path d="M4 21V8l8-4 8 4v13M4 21h16M9 21v-4h6v4M8 11h2M14 11h2M8 14h2M14 14h2" />
    </svg>
  );
}

// "2 prédios ▾": tapping a building's name shows just that building; the
// circle next to it adds or removes it from a multiple selection.
export function BuildingPicker({
  buildings,
  selected,
}: {
  buildings: { name: string; count: number }[];
  selected: string[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(selected);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function save(next: string[], closeAfter = false) {
    if (closeAfter) setOpen(false);
    startTransition(async () => {
      setCurrent(next);
      await saveBuildingSelection(next);
    });
  }

  const label =
    current.length === 0 ? "Todos os prédios" : current.length === 1 ? current[0] : `${current.length} prédios`;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-medium ring-1 ring-slate-200 hover:bg-slate-50"
      >
        <BuildingIcon />
        <span className="max-w-[9rem] truncate">{label}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 rounded-xl bg-surface p-1.5 shadow-xl ring-1 ring-slate-300">
          <ul className="max-h-[60vh] overflow-y-auto">
            {buildings.map((b) => {
              const checked = current.includes(b.name);
              return (
                <li key={b.name} className="flex items-center rounded-lg hover:bg-slate-50">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    aria-label={`${checked ? "Tirar" : "Incluir"} ${b.name} na seleção`}
                    onClick={() =>
                      save(checked ? current.filter((n) => n !== b.name) : [...current, b.name])
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ${
                        checked ? "bg-emerald-500 text-slate-50 ring-emerald-500" : "ring-emerald-500/70"
                      }`}
                    >
                      {checked && (
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden>
                          <path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.5-9.5-1.2-1.2z" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => save([b.name], true)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pr-2 text-left text-sm"
                  >
                    <span className="truncate font-medium uppercase">{b.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{b.count} un.</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => save([], true)}
            className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {current.length ? "Limpar seleção (todos os prédios)" : "Mostrando todos os prédios"}
          </button>
        </div>
      )}
    </div>
  );
}
