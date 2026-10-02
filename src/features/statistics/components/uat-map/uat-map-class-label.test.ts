import { describe, expect, it } from 'vitest'
import { classLabel } from './uat-map-class-label'
import { mapScale } from './uat-map-scales'
import { formatCount } from './uat-map-series'

const count = (value: number) => formatCount(value)
const signed = (value: number) => formatCount(value, { signed: true })
const decimal = (value: number) => formatCount(value, { digits: 1 })

describe('classLabel', () => {
  it('reads whole numbers as closed ranges', () => {
    expect(classLabel(count, { from: 0, to: 21, includesFrom: false }, true)).toBe('1–20')
    expect(classLabel(count, { from: 21, to: 81 }, true)).toBe('21–80')
    expect(classLabel(count, { from: 81, to: null }, true)).toBe('81 sau mai mult')
    expect(classLabel(count, { from: 3, to: 4 }, true)).toBe('3')
    expect(classLabel(count, { from: 0, to: 0, zero: true }, true)).toBe('0')
  })

  it('names the open end of a class of decimals', () => {
    expect(classLabel(decimal, { from: null, to: 2.5 }, false)).toBe(`sub ${decimal(2.5)}`)
    expect(classLabel(decimal, { from: 2.5, to: 5 }, false)).toBe(`${decimal(2.5)} – sub ${decimal(5)}`)
    expect(classLabel(decimal, { from: 10, to: null }, false)).toBe(`${decimal(10)} sau mai mult`)
    expect(classLabel(decimal, { from: 77.9, to: 78.9, includesFrom: false, includesTo: true }, false)).toBe(`peste ${decimal(77.9)} – ${decimal(78.9)}`)
  })

  it('reads the classes around a reference by the side each bound falls on', () => {
    expect(classLabel(signed, { from: -10, to: 10, includesTo: true }, true)).toBe('±10')
    expect(classLabel(signed, { from: -50, to: -10 }, true)).toBe('−50 … −11')
    expect(classLabel(signed, { from: 10, to: 50, includesFrom: false, includesTo: true }, true)).toBe('+11 … +50')
    expect(classLabel(signed, { from: 50, to: null, includesFrom: false }, true)).toBe('peste +50')
  })

  it('counts whole numbers inward from a bound that falls between two of them', () => {
    // A county band on a decimal national figure: [1,2; 3) holds only 2.
    expect(classLabel(count, { from: 1.2, to: 3 }, true)).toBe('2')
    expect(classLabel(count, { from: 3.0000000000000004, to: 13 }, true)).toBe('3–12')
    // Between zero and 1 there is no whole number to name.
    expect(classLabel(count, { from: 0, to: 1, includesFrom: false }, true)).toBe('—')
  })

  it('names both open ends of a class of decimals, and the first class above zero by its top', () => {
    expect(classLabel(decimal, { from: 0, to: 5.1, includesFrom: false }, false)).toBe(`sub ${decimal(5.1)}`)
    expect(classLabel(decimal, { from: 1, to: 2, includesFrom: false }, false)).toBe(`peste ${decimal(1)} – sub ${decimal(2)}`)
    expect(classLabel(decimal, { from: 77, to: 77.9, includesTo: true }, false)).toBe(`${decimal(77)}–${decimal(77.9)}`)
  })

  it('draws no empty class above zero when most counts are 1', () => {
    const values = [0, 0, 0, ...Array.from({ length: 60 }, () => 1), ...Array.from({ length: 40 }, (_, index) => index + 2)]
    const scale = mapScale(values, { diverging: false, separateZero: true })
    expect(scale.classes.map((drawn) => classLabel(count, drawn.interval, scale.wholeNumbers ?? false))).not.toContain('—')
  })

  it('reads figures shown with a decimal as decimals, even when every one is whole', () => {
    expect(mapScale([10, 45, 93, 210, 500], { diverging: false, digits: 1 }).wholeNumbers).toBe(false)
    expect(mapScale([10, 45, 93, 210, 500], { diverging: false, digits: 0 }).wholeNumbers).toBe(true)
  })

  it('names a figure sitting on a bound in the class that holds it', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1)
    const scale = mapScale(values, { diverging: false })
    expect(scale.wholeNumbers).toBe(true)
    for (const drawn of scale.classes.slice(1)) {
      const bound = Math.round(drawn.interval.from!)
      const holder = scale.classes[scale.classAt(values.indexOf(bound))!]!
      expect(classLabel(count, holder.interval, true).startsWith(count(bound))).toBe(true)
    }
  })

  it('names a figure on a bound above the reference in the class below it, as the map colours it', () => {
    const values = Array.from({ length: 201 }, (_, index) => index - 100)
    const scale = mapScale(values, { diverging: true })
    const far = Math.round(scale.classes[4]!.interval.from!)
    const holder = scale.classes[scale.classAt(values.indexOf(far))!]!
    expect(holder).toBe(scale.classes[3])
    expect(classLabel(signed, holder.interval, true).endsWith(signed(far))).toBe(true)
  })
})
