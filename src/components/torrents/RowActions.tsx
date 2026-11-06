import { Eye, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePauseTorrents, useResumeTorrents } from '@/hooks/useApi'
import { isStoppedState } from '@/lib/torrentState'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types'

interface RowActionsProps {
  torrent: Torrent
  onDetails: (torrent: Torrent) => void
  onDelete: (torrents: Torrent[], withFiles: boolean) => void
  compact?: boolean
}

// Pause or resume, details, and delete, the same in the table and on cards.
export function RowActions({ torrent, onDetails, onDelete, compact }: RowActionsProps) {
  const pause = usePauseTorrents()
  const resume = useResumeTorrents()
  const running = !isStoppedState(torrent.state)
  const size = compact ? 'h-7 w-7' : 'h-8 w-8'
  const icon = compact ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className={size} aria-label={running ? 'Pause' : 'Resume'} title={running ? 'Pause' : 'Resume'} onClick={() => (running ? pause : resume).mutate([torrent.hash])}>
        {running ? <Pause className={icon} /> : <Play className={icon} />}
      </Button>
      <Button variant="ghost" size="icon" className={size} aria-label="Details" title="Details" onClick={() => onDetails(torrent)}>
        <Eye className={icon} />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={size} aria-label="Delete" title="Delete">
            <Trash2 className={icon} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={compact ? 'start' : 'end'}>
          <DropdownMenuItem onClick={() => onDelete([torrent], false)}>Delete</DropdownMenuItem>
          <DropdownMenuItem className={cn('text-destructive')} onClick={() => onDelete([torrent], true)}>Delete + Files</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
