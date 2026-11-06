import type { ReactElement, ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBytes } from '@/lib/format'
import { formatEta, getStateColor, getStateLabel } from '@/lib/torrentState'
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
              <div className="flex justify-between gap-2 text-[10px]">
                <span className={getStateColor(torrent.state, torrent.completion_on)} title={torrent.error || undefined}>{getStateLabel(torrent.state, torrent.completion_on)}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(torrent.progress * 100)}%</span>
              </div>
              <p className="text-xs font-medium [overflow-wrap:anywhere]">{torrent.name}</p>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground tabular-nums">
                <span>{formatBytes(torrent.size)}</span>
                <span className="flex items-center gap-0.5"><ArrowDown className="h-2.5 w-2.5 text-green-500" />{formatBytes(torrent.dlspeed)}/s</span>
                <span className="flex items-center gap-0.5"><ArrowUp className="h-2.5 w-2.5 text-blue-500" />{formatBytes(torrent.upspeed)}/s</span>
                <span>{torrent.progress < 1 ? t('ETA {eta}', { eta: formatEta(torrent.eta) }) : t('Ratio {value}', { value: torrent.ratio.toFixed(2) })}</span>
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
