import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/types'
import { findFinished } from './finished'
import { getSpeedHistory, HISTORY_LENGTH, niceCeiling, recordSpeeds } from './speedHistory'

describe('speed history', () => {
  it('keeps only the most recent samples', () => {
    for (let i = 0; i < HISTORY_LENGTH + 5; i++) recordSpeeds({ time: i, down: i, up: 0 })
    const history = getSpeedHistory()
    expect(history).toHaveLength(HISTORY_LENGTH)
    expect(history[0].time).toBe(5)
  })

  it('rounds the scale up to 1, 2, or 5 times a power of ten', () => {
    expect(niceCeiling(0)).toBe(1)
    expect(niceCeiling(830)).toBe(1000)
    expect(niceCeiling(1500)).toBe(2000)
    expect(niceCeiling(3_100_000)).toBe(5_000_000)
    expect(niceCeiling(5_000_000)).toBe(5_000_000)
  })
})

describe('findFinished', () => {
  const torrent = (hash: string, progress: number) => ({ hash, name: hash, progress }) as Torrent

  it('finds torrents that reached 100% since the last refresh', () => {
    const before = { a: torrent('a', 0.5), b: torrent('b', 1), c: torrent('c', 0.9) }
    const after = { a: torrent('a', 1), b: torrent('b', 1), c: torrent('c', 0.95), d: torrent('d', 1) }
    expect(findFinished(before, after).map(t => t.hash)).toEqual(['a'])
  })

  it('reports nothing on the first load', () => {
    expect(findFinished(undefined, { a: torrent('a', 1) })).toEqual([])
  })
})
