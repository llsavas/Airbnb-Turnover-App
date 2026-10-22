// Cleaners log in with a simple username. Supabase needs an email, so a
// username is stored as <username>@USERNAME_DOMAIN (no email is ever sent).
export const USERNAME_DOMAIN = "turnover.local";

export function loginToEmail(login: string): string {
  const value = login.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${USERNAME_DOMAIN}`;
}

export function emailToLogin(email: string | undefined): string {
  if (!email) return "";
  return email.endsWith(`@${USERNAME_DOMAIN}`) ? email.split("@")[0] : email;
}
