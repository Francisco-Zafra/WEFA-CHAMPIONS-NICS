import { describe, expect, it } from 'vitest'
import { balancePct, fmt, initials, overall, tier } from './rating'

describe('rating', () => {
  it('calcula la media con 2 decimales', () => {
    expect(overall({ rit: 89, tir: 92, pas: 89, reg: 92, def: 89, fis: 83 })).toBe(89)
    expect(overall({ rit: 80, tir: 81, pas: 80, reg: 80, def: 80, fis: 80 })).toBe(80.17)
  })

  it('asigna categoría de carta', () => {
    expect(tier(95)).toBe('gold')
    expect(tier(84.6)).toBe('gold')
    expect(tier(84.4)).toBe('silver')
    expect(tier(75)).toBe('silver')
    expect(tier(74)).toBe('bronze')
  })

  it('formatea en español', () => {
    expect(fmt(86)).toBe('86,0')
    expect(fmt(0.166, 2)).toBe('0,17')
  })

  it('traduce diferencia a equilibrio', () => {
    expect(balancePct(0)).toBe(100)
    expect(balancePct(0.2)).toBe(98)
    expect(balancePct(20)).toBe(0)
  })

  it('saca iniciales', () => {
    expect(initials("Riccardo's Boyfriend")).toBe('RB')
    expect(initials('Ignacio P')).toBe('IP')
    expect(initials('Guti')).toBe('GU')
    expect(initials('Álvaro')).toBe('ÁL')
  })
})
