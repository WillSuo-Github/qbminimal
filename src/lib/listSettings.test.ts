import { describe, expect, it } from 'vitest'
import { DEFAULT_LIST_SETTINGS, parseListSettings } from './listSettings'

describe('parseListSettings', () => {
  it('reads saved settings', () => {
    const saved = { sortField: 'added_on', sortDirection: 'desc', status: 'seeding', category: 'Linux', tag: 'iso', tracker: 'example.org', view: 'table', pageSize: 100 }
    expect(parseListSettings(JSON.stringify(saved))).toEqual(saved)
  })

  it('uses defaults for missing, broken, or unknown values', () => {
    expect(parseListSettings(null)).toEqual(DEFAULT_LIST_SETTINGS)
    expect(parseListSettings('not json')).toEqual(DEFAULT_LIST_SETTINGS)
    expect(parseListSettings(JSON.stringify({ sortField: 'colour', status: 'gone', category: 5, view: 'grid', pageSize: 7 }))).toEqual(DEFAULT_LIST_SETTINGS)
  })
})
