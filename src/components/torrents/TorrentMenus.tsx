import { Fragment, type ReactNode } from 'react'
import { Eye, Pause, Play, Trash2 } from 'lucide-react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/components/ui/context-menu'
import { isStoppedState } from '@/lib/torrentState'
import type { Torrent } from '@/types'
import type { MenuGroup } from './bulkActions'
import { t } from '@/i18n'

// These stay in the right-click menu itself. The rest open as submenus to keep it short.
const INLINE_GROUPS = new Set(['Transfer', 'Organize'])

const countLabel = (torrents: Torrent[]) => (torrents.length === 1 ? torrents[0].name : t('{count} torrents', { count: torrents.length }))

interface TorrentContextMenuProps {
  // Selected torrents, or just the row that opened the menu when it was not selected.
  torrents: Torrent[]
  groups: MenuGroup[]
  onOpenChange: (open: boolean) => void
  onDetails: (torrent: Torrent) => void
  onStart: () => void
  onStop: () => void
  onDelete: () => void
  // The table body or card list it opens from.
  children: ReactNode
}

export function TorrentContextMenu({ torrents, groups, onOpenChange, onDetails, onStart, onStop, onDelete, children }: TorrentContextMenuProps) {
  const anyStopped = torrents.some(t => isStoppedState(t.state))
  const anyRunning = torrents.some(t => !isStoppedState(t.state))

  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      {torrents.length > 0 && (
        <ContextMenuContent className="w-56">
          <ContextMenuLabel title={torrents.length === 1 ? torrents[0].name : undefined}>{countLabel(torrents)}</ContextMenuLabel>
          {torrents.length === 1 && <ContextMenuItem onSelect={() => onDetails(torrents[0])}><Eye />{' '}{t('Details')}</ContextMenuItem>}
          <ContextMenuItem disabled={!anyStopped} onSelect={onStart}><Play />{' '}{t('Start')}</ContextMenuItem>
          <ContextMenuItem disabled={!anyRunning} onSelect={onStop}><Pause />{' '}{t('Stop')}</ContextMenuItem>
          {groups.map(group => INLINE_GROUPS.has(group.name) ? (
            <Fragment key={group.name}>
              <ContextMenuSeparator />
              {group.entries.map(entry => <ContextMenuItem key={entry.label} onSelect={entry.onSelect}>{entry.label}</ContextMenuItem>)}
            </Fragment>
          ) : null)}
          <ContextMenuSeparator />
          {groups.filter(group => !INLINE_GROUPS.has(group.name)).map(group => (
            <ContextMenuSub key={group.name}>
              <ContextMenuSubTrigger>{t(group.name)}</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {group.entries.map(entry => <ContextMenuItem key={entry.label} onSelect={entry.onSelect}>{entry.label}</ContextMenuItem>)}
              </ContextMenuSubContent>
            </ContextMenuSub>
          ))}
          <ContextMenuSeparator />
          <ContextMenuItem destructive onSelect={onDelete}><Trash2 /> {torrents.length === 1 ? t('Delete...') : t('Delete {length}...', { length: torrents.length })}</ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  )
}
