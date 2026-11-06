import { describe, expect, it } from 'vitest'
import { isNewer, newestRelease, parseVersion } from './updates'

describe('update check', () => {
  it('reads version numbers in their usual spellings', () => {
    expect(parseVersion('v1.2.3')).toEqual([1, 2, 3])
    expect(parseVersion('1.10.0')).toEqual([1, 10, 0])
    expect(parseVersion('release-5.1.2')).toEqual([5, 1, 2])
    expect(parseVersion('release-5.1.0beta1')).toBeNull()
    expect(parseVersion(undefined)).toBeNull()
  })

  it('compares each part as a number', () => {
    expect(isNewer([1, 10, 0], [1, 9, 9])).toBe(true)
    expect(isNewer([1, 1, 2], [1, 1, 2])).toBe(false)
    expect(isNewer([1, 1, 1], [1, 1, 2])).toBe(false)
  })

  it('finds the newest finished qBittorrent release among its tags', () => {
    expect(newestRelease(['release-5.0.4', 'release-5.1.2', 'release-5.2.0rc1', 'release-4.6.7', 'v2.0.0'])).toEqual([5, 1, 2])
    expect(newestRelease([])).toBeNull()
  })
})
