const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']

// Binary sizes with at most one decimal, dropping a trailing ".0": 1536 -> "1.5 KB", 1024 -> "1 KB".
// From 1000 of a unit it moves to the next ("1 MB", not "1011.3 KB"), so a value never needs more
// than "999.9" and fits the room the cards and header keep for it.
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  let value = bytes
  let unit = 0
  while (Math.round(value * 10) / 10 >= 1000 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${BYTE_UNITS[unit]}`
}

// qBittorrent uses 8640000 seconds (100 days) to mean "infinite" for ETA-like values.
const INFINITE_SECONDS = 8640000

// Two units at most, such as "2d 3h" or "5m 10s".
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0 || seconds >= INFINITE_SECONDS) return '-'
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']]
  const parts: string[] = []
  let rest = Math.floor(seconds)
  for (const [size, label] of units) {
    const count = Math.floor(rest / size)
    rest -= count * size
    if (count > 0 || (parts.length > 0 && parts.length < 2)) parts.push(`${count}${label}`)
    if (parts.length === 2) break
  }
  return parts.length ? parts.join(' ') : '0s'
}

// Compact local date and time, like 2026-11-06 09:41. Unset times (0 or less) show as '-'.
export function formatDateTime(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '-'
  const d = new Date(seconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
