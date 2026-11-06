import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Torrent } from '@/types'
import { PeersTab } from './PeersTab'
import { TorrentActions } from './TorrentActions'
import { TorrentContentTab } from './TorrentContentTab'
import { TorrentInfoTab } from './TorrentInfoTab'
import { TrackersTab } from './TrackersTab'

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'content', label: 'Content' },
  { id: 'actions', label: 'Actions' },
  { id: 'trackers', label: 'Trackers' },
  { id: 'peers', label: 'Peers' },
] as const

// Everything about one torrent. Each tab's key is the hash, so switching torrents starts it fresh.
export function TorrentDetailsDialog({ torrent, onClose }: { torrent: Torrent; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="truncate pr-6" title={torrent.name}>{torrent.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="details" className="min-h-0 flex-1">
          <TabsList className="grid w-full grid-cols-5">
            {TABS.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="px-0.5 text-xs sm:text-sm">{tab.label}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="details" className="overflow-y-auto"><TorrentInfoTab torrent={torrent} /></TabsContent>
          <TabsContent value="content" className="flex min-h-0 flex-col overflow-hidden"><TorrentContentTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
          <TabsContent value="actions" className="overflow-y-auto"><TorrentActions key={torrent.hash} torrent={torrent} /></TabsContent>
          <TabsContent value="trackers" className="overflow-y-auto"><TrackersTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
          <TabsContent value="peers" className="overflow-y-auto"><PeersTab key={torrent.hash} hash={torrent.hash} /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
