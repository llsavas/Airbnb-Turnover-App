"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requiredText, toFormState, type FormState } from "@/lib/form";
import { loginToEmail } from "@/lib/usernames";

export async function signIn(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const login = requiredText(formData, "login", "Usuário ou e-mail");
    const password = requiredText(formData, "password", "Senha");

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginToEmail(login),
      password,
    });
    if (error) return { error: "Usuário ou senha incorretos." };
  } catch (error) {
    return toFormState(error);
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
