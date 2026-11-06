import type { Torrent } from '@/types'

// Torrents that finished downloading between two refreshes of the list.
export function findFinished(before: Record<string, Torrent> | undefined, after: Record<string, Torrent>): Torrent[] {
  if (!before) return []
  return Object.entries(after).flatMap(([hash, torrent]) => {
    const previous = before[hash]
    return previous && previous.progress < 1 && torrent.progress >= 1 ? [torrent] : []
  })
}
