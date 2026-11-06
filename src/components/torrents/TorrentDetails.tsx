import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBackButtonClose } from '@/hooks/useBackButtonClose'
import { readStored, writeStored } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { Torrent } from '@/types'
import { PeersTab } from './PeersTab'
import { TorrentActions } from './TorrentActions'
import { TorrentContentTab } from './TorrentContentTab'
import { TorrentInfoTab } from './TorrentInfoTab'
import { TrackersTab } from './TrackersTab'
import { t } from '@/i18n'

const TABS = [
  { id: 'details', label: t('Details') },
  { id: 'content', label: t('Content') },
  { id: 'actions', label: t('Actions') },
  { id: 'trackers', label: t('Trackers') },
  { id: 'peers', label: t('Peers') },
] as const

const HEIGHT_KEY = 'qbminimal.detailsHeight'
const TAB_KEY = 'qbminimal.detailsTab'
type TabId = (typeof TABS)[number]['id']
const isTabId = (value: string | null): value is TabId => TABS.some(tab => tab.id === value)
const MIN_HEIGHT = 160
// The list keeps at least this much of the window.
const LIST_ROOM = 200

const clampHeight = (height: number) => Math.round(Math.max(MIN_HEIGHT, Math.min(height, window.innerHeight - LIST_ROOM)))

function initialHeight() {
  const stored = Number(readStored(HEIGHT_KEY))
  return clampHeight(stored > 0 ? stored : window.innerHeight * 0.4)
}

// Everything about one torrent. The open tab is remembered, also for the next time details open,
// and each tab's key is the hash, so its content starts fresh for another torrent.
function DetailsTabs({ torrent, listClassName }: { torrent: Torrent; listClassName?: string }) {
  const [tab, setTab] = useState<TabId>(() => {
    const stored = readStored(TAB_KEY)
    return isTabId(stored) ? stored : 'details'
  })
  const choose = (value: string) => {
    if (!isTabId(value)) return
    setTab(value)
    writeStored(TAB_KEY, value)
  }
  return (
    <Tabs value={tab} onValueChange={choose} className="min-h-0 flex-1">
      <TabsList className={cn('grid grid-cols-5', listClassName)}>
        {TABS.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="px-0.5 text-xs sm:px-3 sm:text-sm">{tab.label}</TabsTrigger>)}
      </TabsList>
      <TabsContent value="details" className="overflow-y-auto"><TorrentInfoTab torrent={torrent} /></TabsContent>
      <TabsContent value="content" className="flex min-h-0 flex-col overflow-hidden"><TorrentContentTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
      <TabsContent value="actions" className="overflow-y-auto"><TorrentActions key={torrent.hash} torrent={torrent} /></TabsContent>
      <TabsContent value="trackers" className="overflow-y-auto"><TrackersTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
      <TabsContent value="peers" className="overflow-y-auto"><PeersTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
    </Tabs>
  )
}

interface DetailsProps {
  torrent: Torrent
  onClose: () => void
}

// Wide screens: a panel along the bottom of the window, below the list, with an edge to drag
// for its height. Picking another torrent in the list shows that one instead.
export function TorrentDetailsPanel({ torrent, onClose }: DetailsProps) {
  const [height, setHeight] = useState(initialHeight)
  const drag = useRef<{ y: number; height: number } | null>(null)

  // Shared, so the table's scrollbar can sit just above the panel.
  useEffect(() => {
    document.documentElement.style.setProperty('--details-height', `${height}px`)
  }, [height])
  useEffect(() => () => { document.documentElement.style.removeProperty('--details-height') }, [])

  const commit = (next: number) => {
    const clamped = clampHeight(next)
    setHeight(clamped)
    writeStored(HEIGHT_KEY, String(clamped))
  }
  const startDrag = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, height }
  }
  const moveDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) setHeight(clampHeight(drag.current.height + drag.current.y - e.clientY))
  }
  const endDrag = () => {
    if (drag.current) commit(height)
    drag.current = null
  }
  const onEdgeKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    commit(height + (e.key === 'ArrowUp' ? 32 : -32))
  }

  return (
    <>
      {/* Room at the end of the page, so the last rows can scroll above the panel. */}
      <div aria-hidden style={{ height }} />
      <section
        aria-label={t('Torrent details')}
        className="fixed right-0 bottom-0 z-30 flex flex-col border-t bg-card shadow-[0_-6px_16px_-8px_rgb(0_0_0/0.15)]"
        style={{ height, left: 'var(--sidebar-width, 0px)' }}
      >
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('Resize details')}
          aria-valuenow={height}
          tabIndex={0}
          title={t('Drag to resize')}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onEdgeKey}
          className="group flex h-3 flex-shrink-0 cursor-row-resize touch-none items-center justify-center outline-none"
        >
          <span className="h-1 w-10 rounded-full bg-border group-hover:bg-primary/60 group-focus-visible:bg-primary" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-sm font-medium" title={torrent.name}>{torrent.name}</h2>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label={t('Close details')} title={t('Close (Esc)')} onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DetailsTabs torrent={torrent} listClassName="w-full max-w-xl" />
        </div>
      </section>
    </>
  )
}

// Phones: a dialog over the list, which the back button closes too.
export function TorrentDetailsDialog({ torrent, onClose }: DetailsProps) {
  useBackButtonClose(onClose)
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-6" title={torrent.name}>{torrent.name}</DialogTitle>
        </DialogHeader>
        <DetailsTabs torrent={torrent} listClassName="w-full" />
      </DialogContent>
    </Dialog>
  )
}
