import { afterEach, describe, expect, it } from 'vitest'
import de from './de'
import { detectLanguage, t, setCatalogForTests } from './index'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()

describe('translations', () => {
  afterEach(() => setCatalogForTests({}, 'en'))

  it('falls back to the English text and fills in values', () => {
    expect(t('{count} selected', { count: 3 })).toBe('3 selected')
    setCatalogForTests({ '{count} selected': '{count} ausgewählt' })
    expect(t('{count} selected', { count: 3 })).toBe('3 ausgewählt')
    expect(t('Not translated')).toBe('Not translated')
  })

  it('picks the first browser language it has, or English', () => {
    expect(detectLanguage(['de-AT', 'en-US'])).toBe('de')
    expect(detectLanguage(['fr-FR', 'en-GB'])).toBe('en')
    expect(detectLanguage([])).toBe('en')
  })

  it('keeps every placeholder in the German text', () => {
    const broken = Object.entries(de).filter(([english, german]) => placeholders(english).join() !== placeholders(german).join())
    expect(broken).toEqual([])
  })
})
