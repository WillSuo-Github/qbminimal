import { describe, expect, it } from 'vitest'
import { COLUMN_IDS, DEFAULT_COLUMN_LAYOUT, compareTorrents, moveColumn, parseColumnLayout, resizeColumn, shiftColumn, toggleColumn, trackerHost, visibleColumns } from './torrentColumns'
import type { Torrent } from '@/types'

describe('column layout', () => {
  it('starts with the default columns', () => {
    expect(parseColumnLayout(null)).toEqual(DEFAULT_COLUMN_LAYOUT)
    expect(visibleColumns(DEFAULT_COLUMN_LAYOUT)[0].id).toBe('name')
  })

  it('keeps a saved layout and adds columns it did not know about at the end, with their default visibility', () => {
    const layout = parseColumnLayout(JSON.stringify({ order: ['ratio', 'name', 'bogus'], hidden: ['size', 'name'], widths: { name: 5, ratio: 90, bogus: 3 } }))
    expect(layout.order.slice(0, 2)).toEqual(['ratio', 'name'])
    expect(layout.order).toHaveLength(COLUMN_IDS.length)
    expect(layout.hidden).toContain('size')
    expect(layout.hidden).toContain('tags')
    expect(layout.hidden).not.toContain('name')
    expect(layout.hidden).not.toContain('progress')
    expect(layout.widths).toEqual({ name: 120, ratio: 90 })
  })

  it('falls back to defaults for broken data', () => {
    expect(parseColumnLayout('{')).toEqual(DEFAULT_COLUMN_LAYOUT)
  })

  it('hides and shows columns, but never the name', () => {
    expect(toggleColumn(DEFAULT_COLUMN_LAYOUT, 'size').hidden).toContain('size')
    expect(toggleColumn(DEFAULT_COLUMN_LAYOUT, 'tags').hidden).not.toContain('tags')
    expect(toggleColumn(DEFAULT_COLUMN_LAYOUT, 'name')).toBe(DEFAULT_COLUMN_LAYOUT)
  })

  it('moves columns by drag target or one step', () => {
    expect(moveColumn(DEFAULT_COLUMN_LAYOUT, 'ratio', 'name').order.slice(0, 2)).toEqual(['ratio', 'name'])
    expect(shiftColumn(DEFAULT_COLUMN_LAYOUT, 'size', -1).order.slice(0, 2)).toEqual(['size', 'name'])
    expect(shiftColumn(DEFAULT_COLUMN_LAYOUT, 'name', -1)).toBe(DEFAULT_COLUMN_LAYOUT)
  })

  it('keeps widths within limits', () => {
    expect(resizeColumn(DEFAULT_COLUMN_LAYOUT, 'size', 10).widths.size).toBe(48)
    expect(resizeColumn(DEFAULT_COLUMN_LAYOUT, 'size', 5000).widths.size).toBe(1200)
  })
})

describe('sorting', () => {
  const t = (fields: Partial<Torrent>) => ({ name: 'a', eta: 0, priority: 0, ...fields }) as Torrent

  it('sorts names naturally and numbers by value', () => {
    expect(compareTorrents(t({ name: 'file 2' }), t({ name: 'file 10' }), 'name')).toBeLessThan(0)
    expect(compareTorrents(t({ ratio: 2 }), t({ ratio: 0.5 }), 'ratio')).toBeGreaterThan(0)
  })

  it('puts unknown ETAs and queue positions last', () => {
    expect(compareTorrents(t({ eta: 8640000 }), t({ eta: 60 }), 'eta')).toBeGreaterThan(0)
    expect(compareTorrents(t({ priority: -1 }), t({ priority: 3 }), 'priority')).toBeGreaterThan(0)
  })

  it('shows trackers by host', () => {
    expect(trackerHost('https://tracker.example.org:443/announce')).toBe('tracker.example.org')
    expect(trackerHost('')).toBe('')
  })
})
