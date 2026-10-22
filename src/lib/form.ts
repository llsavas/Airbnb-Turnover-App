export type FormState = { error?: string; success?: string } | null;

export function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function requiredText(formData: FormData, key: string, label: string): string {
  const value = text(formData, key);
  if (!value) throw new FormError(`Preencha o campo "${label}".`);
  return value;
}

export function int(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

// Thrown inside actions for messages meant for the user.
export class FormError extends Error {}

export function toFormState(error: unknown): FormState {
  if (error instanceof FormError) return { error: error.message };
  console.error(error);
  return { error: "Algo deu errado. Tente novamente." };
}
