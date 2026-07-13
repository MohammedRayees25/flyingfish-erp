// Builds tel:/wa.me links from stored phone numbers. Numbers are stored as
// entered (which may include spaces, dashes, or a leading +country code);
// WhatsApp's wa.me requires digits only.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const params = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${params}`;
}
