import { describe, expect, it } from 'vitest'
import { rangeBetween } from './selection'

describe('rangeBetween', () => {
  const order = ['a', 'b', 'c', 'd', 'e']

  it('includes both ends, in either direction', () => {
    expect(rangeBetween(order, 'b', 'd')).toEqual(['b', 'c', 'd'])
    expect(rangeBetween(order, 'd', 'b')).toEqual(['b', 'c', 'd'])
  })

  it('is one item when both ends are the same', () => {
    expect(rangeBetween(order, 'c', 'c')).toEqual(['c'])
  })

  it('falls back to the clicked item when the anchor is gone', () => {
    expect(rangeBetween(order, 'x', 'c')).toEqual(['c'])
    expect(rangeBetween(order, 'c', 'x')).toEqual([])
  })
})
