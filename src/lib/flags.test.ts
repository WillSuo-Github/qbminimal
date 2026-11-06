import { describe, expect, it } from 'vitest'
import { countryFlag } from './flags'

describe('countryFlag', () => {
  it('makes a flag from a lower or upper case country code', () => {
    expect(countryFlag('de')).toBe('🇩🇪')
    expect(countryFlag('US')).toBe('🇺🇸')
  })

  it('gives nothing for missing or unusual codes', () => {
    expect(countryFlag(undefined)).toBe('')
    expect(countryFlag('')).toBe('')
    expect(countryFlag('eur')).toBe('')
    expect(countryFlag('1a')).toBe('')
  })
})
