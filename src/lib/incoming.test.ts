import { describe, expect, it, vi } from 'vitest'
import { hasIncoming, magnetHandlerUrl, onIncoming, readMagnetFromAddress, sendToAdd, takeIncoming } from './incoming'

describe('incoming torrents', () => {
  it('collects links and files until they are taken, once', () => {
    const listener = vi.fn()
    const stop = onIncoming(listener)
    sendToAdd({ links: ['magnet:?xt=urn:btih:a'] })
    sendToAdd({ links: ['magnet:?xt=urn:btih:b'] })
    expect(listener).toHaveBeenCalledTimes(2)
    expect(hasIncoming()).toBe(true)
    expect(takeIncoming().links).toEqual(['magnet:?xt=urn:btih:a', 'magnet:?xt=urn:btih:b'])
    expect(hasIncoming()).toBe(false)
    stop()
  })

  it('builds the handler address from the page, with the placeholder browsers fill in', () => {
    expect(magnetHandlerUrl({ origin: 'https://example.com', pathname: '/qbt/' })).toBe('https://example.com/qbt/?magnet=%s')
  })

  it('reads only magnet links from the address', () => {
    expect(readMagnetFromAddress({ search: '?magnet=magnet%3A%3Fxt%3Durn%3Abtih%3Aabc' })).toBe('magnet:?xt=urn:btih:abc')
    expect(readMagnetFromAddress({ search: '?magnet=https%3A%2F%2Fexample.com' })).toBeNull()
    expect(readMagnetFromAddress({ search: '' })).toBeNull()
  })
})
