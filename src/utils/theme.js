/** A partir de un color genera la rampa 50–950 y la aplica como variables CSS (patrón HOTEL). Solo acepta #RRGGBB. */
const KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const L = { 50: 97, 100: 93, 200: 86, 300: 76, 400: 66, 500: 58, 600: 50, 700: 42, 800: 34, 900: 27, 950: 17 }
export const isHex = (v) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}$/.test(v)

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToRgb(h, s, l) {
  s /= 100
  l /= 100
  const k = (n) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255))
}

function rampOf(prefix, hex) {
  const { h, s } = hexToHsl(hex)
  const sat = Math.max(40, Math.min(s, 90))
  for (const k of KEYS) {
    const [r, g, b] = hslToRgb(h, sat, L[k])
    document.documentElement.style.setProperty(`--${prefix}-${k}`, `${r} ${g} ${b}`)
  }
}

export function applyBrand(primary, accent) {
  if (isHex(primary)) rampOf('brand', primary)
  if (isHex(accent)) rampOf('accent', accent)
}

