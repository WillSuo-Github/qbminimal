import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Torrent } from '@/types'

export interface DeleteRequest {
  torrents: Pick<Torrent, 'hash' | 'name'>[]
  withFiles: boolean
}

interface DeleteTorrentsDialogProps {
  // Kept after closing, so the text doesn't vanish while the dialog fades out.
  request: DeleteRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (request: DeleteRequest) => void
}

export function DeleteTorrentsDialog({ request, open, onOpenChange, onConfirm }: DeleteTorrentsDialogProps) {
  const count = request?.torrents.length ?? 0
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{count === 1 ? 'Delete this torrent?' : `Delete ${count} torrents?`}</DialogTitle>
          <DialogDescription>
            {request?.withFiles
              ? 'Their downloaded files are deleted from disk too. This can\'t be undone.'
              : 'Only the entry in qBittorrent goes. The downloaded files stay on disk.'}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
          {request?.torrents.map(torrent => <li key={torrent.hash} className="[overflow-wrap:anywhere]">{torrent.name}</li>)}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => request && onConfirm(request)}>{request?.withFiles ? 'Delete + Files' : 'Delete'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
