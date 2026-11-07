/**
 * Presentation helper shared by the admin UI and the weekly digest. Identity
 * is not its business: it prints the display address it is handed.
 */
export function formatContact({ name, email }) {
  const label = name && name.trim() ? name.trim() : email
  return email ? `${label} <${email}>` : String(label ?? '')
}
