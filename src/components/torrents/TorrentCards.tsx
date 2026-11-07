import type { ComponentType, ReactElement, ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Clock, Users } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBytes } from '@/lib/format'
import { DOWN_SPEED_COLOR, formatEta, getStateColor, getStateLabel, ratioColor, UP_SPEED_COLOR, peerPair as pair } from '@/lib/torrentState'
import { cn } from '@/lib/utils'
import type { RowProps } from '@/hooks/useRowPress'
import type { Torrent } from '@/types'
import { t } from '@/i18n'

interface TorrentCardsProps {
  torrents: Torrent[]
  selected: ReadonlySet<string>
  // Checkboxes show while selecting, and always where there's a mouse.
  showCheckboxes: boolean
  onToggle: (hash: string, range: boolean) => void
  openHash: string | null
  rowProps: (torrent: Torrent) => RowProps
  wrapList: (list: ReactElement) => ReactNode
}

// A number with an icon in place of its name, which the tooltip and screen readers give. Each
// sits at the end of a slot with room for its longest usual value, so the gaps between facts are
// all the same and none moves when a number changes.
function Fact({ icon: Icon, label, className, children }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; label: string; className?: string; children: ReactNode }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-end gap-0.5', className)} title={label}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      <span aria-hidden>{children}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

// A speed in the list's colors. The arrow starts a slot with room for "999.9 KB/s" and the number
// ends it; the rare longer speed widens it. At zero the slot stays, empty, so nothing after it moves.
function Speed({ icon: Icon, bytes, color, label }: { icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; bytes: number; color: string; label: string }) {
  if (bytes <= 0) return <span className="min-w-[6.6em] shrink-0" aria-hidden />
  return (
    <span className={cn('flex min-w-[6.6em] shrink-0 items-center justify-between gap-0.5', color)} title={label}>
      <Icon className="h-2.5 w-2.5" aria-hidden />
      {formatBytes(bytes)}/s
    </span>
  )
}

// The phone layout: one card per torrent. A tap opens its details, and holding a card starts
// selecting, after which taps add or remove cards. Wide screens get a grid.
export function TorrentCards({ torrents, selected, showCheckboxes, onToggle, openHash, rowProps, wrapList }: TorrentCardsProps) {
  return wrapList(
    <ul className="grid items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3">
      {torrents.map(torrent => {
        const isSelected = selected.has(torrent.hash)
        return (
          <li
            key={torrent.hash}
            {...rowProps(torrent)}
            aria-selected={isSelected}
            className={cn(
              'flex cursor-default items-start gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm transition-[transform,border-color] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring [-webkit-touch-callout:none] active:scale-[0.99]',
              isSelected && 'border-primary ring-1 ring-primary',
              openHash === torrent.hash && !isSelected && 'border-primary/60',
            )}
          >
            {showCheckboxes && (
              <Checkbox
                className="mt-0.5"
                aria-label={t('Select {name}', { name: torrent.name })}
                checked={isSelected}
                onClick={(e) => { e.preventDefault(); onToggle(torrent.hash, e.shiftKey) }}
              />
            )}
            <div className="min-w-0 flex-1">
              {/* The status has room for the usual ones ("Downloading", "Missing Files"), so the
                  percentage beside it stays put as the status changes. */}
              <div className="flex items-center gap-x-3 text-[10px] whitespace-nowrap">
                <span className={cn('min-w-[6.6em] shrink-0', getStateColor(torrent.state, torrent.completion_on))} title={torrent.error || undefined}>{getStateLabel(torrent.state, torrent.completion_on)}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(torrent.progress * 100)}%</span>
              </div>
              <p className="text-xs font-medium [overflow-wrap:anywhere]">{torrent.name}</p>
              {/* One line of facts, each with an icon. Hovering or a screen reader gives the words. */}
              {/* Packed from the start with one even gap. The changing values sit in slots wide enough
                  for them, so nothing after them moves; the size has a slot too, so cards line up. */}
              <div className="mt-0.5 flex items-center gap-x-3 overflow-hidden text-[10px] whitespace-nowrap text-muted-foreground tabular-nums">
                <span className="min-w-[4.2em] shrink-0">{formatBytes(torrent.size)}</span>
                <Speed icon={ArrowDown} bytes={torrent.dlspeed} color={DOWN_SPEED_COLOR} label={t('Down speed')} />
                <Speed icon={ArrowUp} bytes={torrent.upspeed} color={UP_SPEED_COLOR} label={t('Up speed')} />
                {torrent.progress < 1 ? (
                  <Fact icon={Clock} label={t('ETA {eta}', { eta: formatEta(torrent.eta) })} className="w-[5.7em]">{formatEta(torrent.eta)}</Fact>
                ) : (
                  <Fact icon={ArrowUpDown} label={t('Ratio {value}', { value: torrent.ratio.toFixed(2) })} className={cn('w-[5.7em]', ratioColor(torrent.ratio))}>{torrent.ratio.toFixed(2)}</Fact>
                )}
                {/* Connected seeds and peers; the title adds how many are in the swarm. */}
                <Fact icon={Users} label={t('Seeds {seeds} · Peers {peers}', { seeds: pair(torrent.num_seeds, torrent.num_complete), peers: pair(torrent.num_leechs, torrent.num_incomplete) })}>
                  {Math.max(torrent.num_seeds, 0)}/{Math.max(torrent.num_leechs, 0)}
                </Fact>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-[width]" style={{ width: `${torrent.progress * 100}%` }} />
              </div>
            </div>
          </li>
        )
      })}
    </ul>,
  )
}
