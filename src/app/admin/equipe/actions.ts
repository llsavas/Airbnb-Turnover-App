"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { FormError, requiredText, text, toFormState, type FormState } from "@/lib/form";
import { loginToEmail } from "@/lib/usernames";

function checkPassword(password: string) {
  if (password.length < 6) throw new FormError("A senha precisa ter pelo menos 6 caracteres.");
}

function checkLogin(login: string) {
  if (!login.includes("@") && !/^[a-z0-9._-]+$/i.test(login)) {
    throw new FormError("O usuário pode ter só letras, números, ponto, hífen e sublinhado.");
  }
}

export async function createCleaner(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await requireAdmin();
    const fullName = requiredText(formData, "full_name", "Nome");
    const login = requiredText(formData, "login", "Usuário");
    const password = requiredText(formData, "password", "Senha");
    checkLogin(login);
    checkPassword(password);

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email: loginToEmail(login),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: text(formData, "phone") },
    });
    if (error) {
      if (error.code === "email_exists" || error.status === 422) {
        throw new FormError("Esse usuário já existe. Escolha outro.");
      }
      throw error;
    }
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/equipe");
  redirect("/admin/equipe");
}

export async function updateCleaner(
  id: string,
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdmin();
    const active = formData.get("active") !== "off";
    const password = text(formData, "password");
    if (password) checkPassword(password);

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({
        full_name: requiredText(formData, "full_name", "Nome"),
        phone: text(formData, "phone"),
        active,
      })
      .eq("id", id)
      .eq("role", "cleaner");
    if (error) throw error;

    // Deactivated cleaners are also blocked from signing in.
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      ...(password ? { password } : {}),
      ban_duration: active ? "none" : "876000h",
    });
    if (authError) throw authError;
  } catch (error) {
    return toFormState(error);
  }
  revalidatePath("/admin/equipe");
  redirect("/admin/equipe");
}
