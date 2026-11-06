import { Folder, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { getRSSParent } from '@/lib/rss'
import { cn } from '@/lib/utils'
import type { RSSFeed } from '@/types'
import { rssName, type Prompt } from './rssActions'

const STEP = 12

interface FeedTreeProps {
  feeds: RSSFeed[]
  folders: string[]
  selected: string | null
  onSelect: (uid: string) => void
  onRefresh: (path: string, label: string) => void
  onMarkRead: (path: string) => void
  onPrompt: (prompt: Prompt) => void
}

// qBittorrent's feed folders as a tree, each feed and folder with its own menu.
export function FeedTree({ feeds, folders, selected, onSelect, onRefresh, onMarkRead, onPrompt }: FeedTreeProps) {
  const menu = (label: string, items: [string, () => void, boolean?][]) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label={`Actions for ${label}`} title="Actions" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {items.map(([text, run, danger]) => <DropdownMenuItem key={text} className={cn(danger && 'text-destructive')} onClick={run}>{text}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const feedRow = (feed: RSSFeed, depth: number) => (
    <li key={feed.uid}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected === feed.uid}
        onClick={() => onSelect(feed.uid)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(feed.uid) } }}
        className={cn('flex cursor-pointer items-start gap-1 rounded-md border p-2.5 hover:bg-accent', selected === feed.uid && 'border-primary')}
        style={{ marginLeft: depth * STEP }}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{feed.title}</span>
          <span className="block truncate text-xs text-muted-foreground">{feed.url}</span>
          <span className="mt-1 flex flex-wrap gap-1 text-xs">
            {feed.unreadCount > 0 && <span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">{feed.unreadCount} new</span>}
            {feed.isLoading && <span className="text-muted-foreground">Refreshing...</span>}
            {feed.hasError && <span className="text-destructive">Couldn't fetch</span>}
          </span>
        </span>
        {menu(feed.title, [
          ['Refresh', () => onRefresh(feed.path, 'Refreshing feed')],
          ['Mark all as read', () => onMarkRead(feed.path)],
          ['Rename', () => onPrompt({ kind: 'rename', path: feed.path, isFolder: false })],
          ['Move to folder', () => onPrompt({ kind: 'move', path: feed.path })],
          ['Change address', () => onPrompt({ kind: 'url', feed })],
          ['Refresh time', () => onPrompt({ kind: 'interval', feed })],
          ['Remove', () => onPrompt({ kind: 'remove', path: feed.path, isFolder: false }), true],
        ])}
      </div>
    </li>
  )

  // `parent` is '' for the top level. Folders come before feeds at each level.
  const level = (parent: string, depth: number) => (
    <>
      {folders.filter(path => getRSSParent(path) === parent).map(path => (
        <li key={`folder:${path}`} className="space-y-2">
          <div className="flex items-center gap-1 text-sm font-medium" style={{ marginLeft: depth * STEP }}>
            <Folder className="h-4 w-4 text-yellow-500" />
            <span className="min-w-0 flex-1 truncate">{rssName(path)}</span>
            {menu(`folder ${rssName(path)}`, [
              ['Refresh', () => onRefresh(path, 'Refreshing folder')],
              ['Mark all as read', () => onMarkRead(path)],
              ['Rename', () => onPrompt({ kind: 'rename', path, isFolder: true })],
              ['Move to folder', () => onPrompt({ kind: 'move', path })],
              ['Remove', () => onPrompt({ kind: 'remove', path, isFolder: true }), true],
            ])}
          </div>
          <ul className="space-y-2">{level(path, depth + 1)}</ul>
        </li>
      ))}
      {feeds.filter(feed => getRSSParent(feed.path) === parent).map(feed => feedRow(feed, depth))}
    </>
  )

  if (feeds.length === 0 && folders.length === 0) return <p className="text-sm text-muted-foreground">No feeds yet. Add one with +.</p>
  return <ul className="space-y-2">{level('', 0)}</ul>
}
