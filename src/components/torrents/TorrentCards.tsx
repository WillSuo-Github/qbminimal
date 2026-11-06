import { useState, type MouseEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatBytes } from '@/lib/format'
import { formatEta, getStateColor, getStateLabel } from '@/lib/torrentState'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types'

interface TorrentCardsProps {
  torrents: Torrent[]
  selected: Set<string>
  onSelect: (hash: string, checked: boolean) => void
  onOpen: (event: MouseEvent, torrent: Torrent) => void
  actions: (torrent: Torrent) => ReactNode
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}

// The phone layout: one card per torrent, with more facts a tap away. Wide screens get a grid.
export function TorrentCards({ torrents, selected, onSelect, onOpen, actions }: TorrentCardsProps) {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <ul className="grid items-start gap-2 lg:grid-cols-2 2xl:grid-cols-3">
      {torrents.map(torrent => {
        const expanded = open === torrent.hash
        const toggle = () => setOpen(expanded ? null : torrent.hash)
        return (
          <li
            key={torrent.hash}
            onDoubleClick={(event) => onOpen(event, torrent)}
            className={cn('cursor-pointer rounded-xl border bg-card px-3 py-2.5 shadow-sm', selected.has(torrent.hash) && 'border-primary')}
          >
            <div className="flex items-start gap-2">
              <Checkbox className="mt-0.5" aria-label={`Select ${torrent.name}`} checked={selected.has(torrent.hash)} onCheckedChange={(checked) => onSelect(torrent.hash, !!checked)} />
              <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={expanded} onClick={toggle}>
                <span className="flex justify-between text-[10px]">
                  <span className={getStateColor(torrent.state, torrent.completion_on)} title={torrent.error || undefined}>{getStateLabel(torrent.state, torrent.completion_on)}</span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(torrent.progress * 100)}%</span>
                </span>
                <span className="block text-xs font-medium [overflow-wrap:anywhere]">{torrent.name}</span>
                <span className="mt-0.5 flex gap-2 text-[10px] text-muted-foreground tabular-nums">
                  <span>{formatBytes(torrent.size)}</span>
                  <span className="flex items-center gap-0.5"><ArrowDown className="h-2.5 w-2.5 text-blue-500" />{formatBytes(torrent.dlspeed)}</span>
                  <span className="flex items-center gap-0.5"><ArrowUp className="h-2.5 w-2.5 text-green-500" />{formatBytes(torrent.upspeed)}</span>
                </span>
              </button>
              <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={expanded ? 'Hide details' : 'Show details'} aria-expanded={expanded} onClick={toggle}>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
              </button>
            </div>

            {expanded && (
              <dl className="mt-1.5 space-y-0.5 border-t pt-1.5 text-[10px]">
                <Fact label="ETA">{formatEta(torrent.eta)}</Fact>
                <Fact label="Ratio">{torrent.ratio.toFixed(2)}</Fact>
                <Fact label="Seeds">{torrent.num_seeds}</Fact>
                <Fact label="Peers">{torrent.num_leechs}</Fact>
              </dl>
            )}

            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${torrent.progress * 100}%` }} />
            </div>
            <div className="mt-1">{actions(torrent)}</div>
          </li>
        )
      })}
    </ul>
  )
}
