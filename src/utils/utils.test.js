import { describe, expect, it } from 'vitest'
import { addDays, initials, money, moneyInput, pct } from './format'
import { email, passwordProblem, rfc, validate, required, onlyDigits } from './validators'
import { label, CHARGE_STATUS, PERIODS } from './labels'

describe('formato', () => {
  it('formatea importes en pesos y marca vacíos', () => {
    expect(money(1398)).toContain('1,398.00')
    expect(money(null)).toBe('—')
    expect(pct(97.456)).toBe('97.5 %')
  })

  it('limita la captura de importes a 2 decimales', () => {
    expect(moneyInput('$1,042.849')).toBe('1042.84')
    expect(moneyInput('abc')).toBe('')
  })

  it('suma días sin errores de zona horaria en fin de mes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('iniciales', () => {
    expect(initials('Laura Méndez Ruiz')).toBe('LM')
    expect(initials('')).toBe('?')
  })
})

describe('validadores (mismas reglas que la API)', () => {
  it('política de contraseñas', () => {
    expect(passwordProblem('Corta1!')).toMatch(/12/)
    expect(passwordProblem('MiNexora-2026-Ok')).toMatch(/común/)
    expect(passwordProblem('Roberto-Clave-2026', 'roberto@nexora.mx')).toMatch(/correo/)
    expect(passwordProblem('Clave-Segura-2026!Q', 'ana@nexora.mx')).toBeNull()
  })

  it('correo, RFC y dígitos', () => {
    expect(email('a@b')).not.toBeNull()
    expect(email('ana@empresa.mx')).toBeNull()
    expect(rfc('xaxx010101000')).toBeNull()
    expect(rfc('123')).not.toBeNull()
    expect(onlyDigits('(55) 1234-5678 ext', 10)).toBe('5512345678')
  })

  it('validate devuelve el primer error por campo', () => {
    const errors = validate({ name: '', mail: 'x' }, { name: [required('el nombre')], mail: [required('el correo'), email] })
    expect(errors).toEqual({ name: 'Escribe el nombre', mail: 'El correo no es válido' })
  })
})

describe('etiquetas', () => {
  it('traduce estados y cae al código si no existe', () => {
    expect(label(CHARGE_STATUS, 'PARTIAL')).toBe('Parcial')
    expect(label(PERIODS, 'ANNUAL')).toBe('Anual')
    expect(label(PERIODS, 'WEEKLY')).toBe('WEEKLY')
  })
})
