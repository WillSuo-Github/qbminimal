import { describe, expect, it } from 'vitest'
import { newerThan, parseUpdateState } from './updateNotice'

describe('remembered update check', () => {
  it('reads what was saved, and starts empty otherwise', () => {
    expect(parseUpdateState(null)).toEqual({ lastChecked: 0, latest: null })
    expect(parseUpdateState('{')).toEqual({ lastChecked: 0, latest: null })
    expect(parseUpdateState(JSON.stringify({ lastChecked: 5, latest: { qbminimal: '1.4.0', qbittorrent: 7 } })))
      .toEqual({ lastChecked: 5, latest: { qbminimal: '1.4.0', qbittorrent: 'failed' } })
  })

  it('compares the newest found with what runs now, so updating ends the notice', () => {
    expect(newerThan('1.4.0', '1.3.0')).toBe(true)
    expect(newerThan('1.4.0', '1.4.0')).toBe(false)
    expect(newerThan('5.2.3', 'v5.2.3')).toBe(false)
    expect(newerThan('failed', '1.0.0')).toBe(false)
    expect(newerThan('1.4.0', undefined)).toBe(false)
  })
})
