"use client";

import { startTransition, useOptimistic, useState } from "react";
import { compressImage } from "@/lib/image";
import type { CleaningTask } from "@/lib/types";
import { setTaskDone, uploadTaskPhoto } from "../actions";

export type TaskWithPhoto = CleaningTask & { photo_url: string | null };

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
      <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function TaskRow({
  cleaningId,
  task,
  editable,
  onToggle,
}: {
  cleaningId: string;
  task: TaskWithPhoto;
  editable: boolean;
  onToggle: (task: TaskWithPhoto) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTip, setShowTip] = useState(false);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("photo", await compressImage(file));
    const result = await uploadTaskPhoto(cleaningId, task.id, formData);
    if (result?.error) setError(result.error);
    setUploading(false);
  }

  const needsPhoto = task.requires_photo && !task.photo_path;

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={!editable || needsPhoto}
          onClick={() => onToggle(task)}
          aria-pressed={task.done}
          aria-label={task.done ? "Desmarcar" : "Marcar como feito"}
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition ${
            task.done
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 bg-white disabled:bg-slate-100"
          }`}
        >
          {task.done && (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M7.7 13.3 4.4 10l-1.2 1.2 4.5 4.5 9.5-9.5-1.2-1.2z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`text-[15px] leading-snug ${task.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {task.label}
          </p>
          {task.tip && (
            <button
              type="button"
              onClick={() => setShowTip((v) => !v)}
              className="mt-1 text-xs font-medium text-amber-700"
            >
              ★ Dica para nota 5
            </button>
          )}
          {showTip && task.tip && (
            <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{task.tip}</p>
          )}
          {task.requires_photo && (
            <div className="mt-2 flex items-center gap-3">
              {task.photo_url && (
                <a href={task.photo_url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                  <img src={task.photo_url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
                </a>
              )}
              {editable && (
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                    task.photo_path
                      ? "text-slate-700 ring-1 ring-slate-300"
                      : "bg-brand-700 text-white"
                  } ${uploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <CameraIcon />
                  {uploading ? "Enviando…" : task.photo_path ? "Trocar foto" : "Tirar foto"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      onPhoto(e.currentTarget.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}
          {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </li>
  );
}

export function Checklist({
  cleaningId,
  tasks,
  editable,
}: {
  cleaningId: string;
  tasks: TaskWithPhoto[];
  editable: boolean;
}) {
  const [optimisticTasks, setOptimistic] = useOptimistic(
    tasks,
    (state, update: { id: string; done: boolean }) =>
      state.map((t) => (t.id === update.id ? { ...t, done: update.done } : t)),
  );
  const [error, setError] = useState<string | null>(null);

  function toggle(task: TaskWithPhoto) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ id: task.id, done: !task.done });
      const result = await setTaskDone(cleaningId, task.id, !task.done);
      if (result?.error) setError(result.error);
    });
  }

  const doneCount = optimisticTasks.filter((t) => t.done).length;
  const rooms = [...new Set(optimisticTasks.map((t) => t.room))];

  return (
    <div>
      <div className="mb-3">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-semibold">Checklist</span>
          <span className="tabular-nums text-slate-500">
            {doneCount} de {optimisticTasks.length}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${optimisticTasks.length ? (doneCount / optimisticTasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="space-y-4">
        {rooms.map((room) => {
          const roomTasks = optimisticTasks.filter((t) => t.room === room);
          const roomDone = roomTasks.every((t) => t.done);
          return (
            <section key={room} className="rounded-xl bg-white px-4 shadow-sm ring-1 ring-slate-200">
              <h3 className="flex items-center justify-between border-b border-slate-100 py-3 font-semibold">
                {room}
                {roomDone && <span className="text-xs font-medium text-emerald-700">✓ Pronto</span>}
              </h3>
              <ul className="divide-y divide-slate-100">
                {roomTasks.map((task) => (
                  <TaskRow key={task.id} cleaningId={cleaningId} task={task} editable={editable} onToggle={toggle} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
