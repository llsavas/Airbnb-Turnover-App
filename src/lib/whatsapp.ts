// wa.me link for a phone typed any way ("(51) 99999-0000", "+55 51…").
// Brazilian numbers without the country code get 55.
export function whatsappLink(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits.length >= 12 ? `https://wa.me/${digits}` : null;
}
