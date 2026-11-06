// The items from one to the other, inclusive, in the order shown, whichever comes first.
// An item that isn't shown any more makes the range just the other one.
export function rangeBetween<T>(order: readonly T[], from: T, to: T): T[] {
  const start = order.indexOf(from)
  const end = order.indexOf(to)
  if (start < 0 || end < 0) return end < 0 ? [] : [to]
  return order.slice(Math.min(start, end), Math.max(start, end) + 1)
}
