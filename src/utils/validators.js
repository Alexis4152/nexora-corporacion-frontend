/** Espejo de las reglas del backend (shared/util/Validation.java). El backend vuelve a validar todo. */
export const PATTERNS = {
  phone: /^\d{10}$/,
  rfc: /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
  zip: /^\d{5}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  code: /^[A-Z][A-Z0-9_]{1,29}$/,
  hex: /^#[0-9A-Fa-f]{6}$/,
}
export const required = (label) => (v) => (v == null || String(v).trim() === '' ? `Escribe ${label}` : null)
export const email = (v) => (v && !PATTERNS.email.test(String(v).trim()) ? 'El correo no es válido' : null)
export const phone = (v) => (v && !PATTERNS.phone.test(v) ? 'Debe tener 10 dígitos' : null)
export const rfc = (v) => (v && !PATTERNS.rfc.test(String(v).toUpperCase()) ? 'RFC no válido' : null)
export const zip = (v) => (v && !PATTERNS.zip.test(v) ? 'Código postal de 5 dígitos' : null)
export const positive = (label) => (v) => (v === '' || v == null || Number(v) <= 0 ? `Escribe ${label} mayor a cero` : null)

export function passwordProblem(v, mail) {
  if (!v || v.length < 12) return 'Mínimo 12 caracteres'
  if (v.length > 72) return 'Máximo 72 caracteres'
  if (!/\p{Lu}/u.test(v) || !/\p{Ll}/u.test(v) || !/\d/.test(v) || !/[^\p{L}\d]/u.test(v)) return 'Incluye mayúscula, minúscula, número y símbolo'
  if (['password', 'contrasena', 'contraseña', 'nexora', 'qwerty', '123456', 'admin'].some((w) => v.toLowerCase().includes(w))) return 'Contiene una palabra demasiado común'
  if (mail && mail.includes('@')) {
    const local = mail.split('@')[0].toLowerCase()
    if (local.length >= 4 && v.toLowerCase().includes(local)) return 'No debe contener tu correo'
  }
  return null
}

export function validate(values, rules) {
  const errors = {}
  for (const [field, fns] of Object.entries(rules)) {
    for (const fn of fns) {
      const e = fn(values[field], values)
      if (e) { errors[field] = e; break }
    }
  }
  return errors
}
export const onlyDigits = (v, max = 10) => String(v).replace(/\D/g, '').slice(0, max)

