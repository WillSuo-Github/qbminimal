import { describe, expect, it } from 'vitest'
import { formatBytes, formatDuration } from './format'

describe('formatDuration', () => {
  it('shows at most two units', () => {
    expect(formatDuration(2 * 86400 + 3 * 3600 + 59)).toBe('2d 3h')
    expect(formatDuration(310)).toBe('5m 10s')
  })

  it('keeps a zero middle unit so the pair stays adjacent', () => {
    expect(formatDuration(86400 + 30)).toBe('1d 0h')
  })

  it('handles zero and short times', () => {
    expect(formatDuration(0)).toBe('0s')
    expect(formatDuration(45)).toBe('45s')
  })

  it('shows a dash for unknown, negative, or infinite values', () => {
    expect(formatDuration(undefined)).toBe('-')
    expect(formatDuration(-1)).toBe('-')
    expect(formatDuration(8640000)).toBe('-')
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [-5, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [2345678, '2.2 MB'],
    [1073741824, '1 GB'],
    [1048524, '1023.9 KB'],
  ])('formats %d', (bytes, text) => expect(formatBytes(bytes)).toBe(text))
})
