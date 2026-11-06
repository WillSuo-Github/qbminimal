import { useState, type FormEvent, type ReactNode } from 'react'
import { Ban } from 'lucide-react'
import { BannedPeers } from '@/components/BannedPeers'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTorrentAction, useTorrentPeers } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { parsePeerAddresses } from '@/lib/peers'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { DOWN_SPEED_COLOR, UP_SPEED_COLOR } from '@/lib/torrentState'
import type { TorrentPeer } from '@/types'
import { PeerFlag } from './PeerFlag'
import { t } from '@/i18n'

const percent = (fraction: number | undefined) => `${Math.round((fraction ?? 0) * 1000) / 10}%`
const speed = (bytes: number | undefined, color: string) =>
  bytes && bytes > 0 ? <span className={color}>{formatBytes(bytes)}/s</span> : <span className="text-muted-foreground/60">-</span>

// Everything qBittorrent's peer list shows, as labelled values. Hovering the flags explains them.
function PeerFacts({ peer }: { peer: TorrentPeer }) {
  // Label, value, an optional tooltip, and whether it takes a whole line (long names do).
  const facts: [string, ReactNode, string?, boolean?][] = [
    [t('Port'), peer.port ?? '-'],
    [t('Connection'), peer.connection || '-'],
    [t('Flags'), peer.flags?.trim() || '-', peer.flags_desc],
    [t('Progress'), percent(peer.progress)],
    [t('Down speed'), speed(peer.dl_speed, DOWN_SPEED_COLOR)],
    [t('Up speed'), speed(peer.up_speed, UP_SPEED_COLOR)],
    [t('Downloaded'), formatBytes(peer.downloaded ?? 0)],
    [t('Uploaded'), formatBytes(peer.uploaded ?? 0)],
    [t('Relevance'), percent(peer.relevance)],
    [t('Client'), peer.client || t('Unknown client'), undefined, true],
    [t('Peer ID client'), peer.peer_id_client || '-', undefined, true],
  ]
  const files = (peer.files ?? '').split('\n').filter(Boolean)
  return (
    <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs min-[400px]:grid-cols-2">
      {facts.map(([label, value, title, wide]) => (
        <div key={label} className={cn('flex min-w-0 justify-between gap-2', wide && 'col-span-full')}>
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate text-end tabular-nums" title={title || (typeof value === 'string' || typeof value === 'number' ? String(value) : undefined)}>{value}</dd>
        </div>
      ))}
      {files.length > 0 && (
        <div className="col-span-full flex min-w-0 gap-2">
          <dt className="shrink-0 text-muted-foreground">{t('Files')}</dt>
          <dd className="min-w-0 flex-1 text-end">
            {files.map(file => <p key={file} className="truncate" dir="auto" title={file}>{file}</p>)}
          </dd>
        </div>
      )}
    </dl>
  )
}

export function PeersTab({ hash }: { hash: string }) {
  const { data, isLoading, isError } = useTorrentPeers(hash)
  const peers = data?.peers
  const action = useTorrentAction()
  const [newPeers, setNewPeers] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    const { valid, invalid } = parsePeerAddresses(newPeers)
    if (invalid.length > 0 || valid.length === 0) {
      toast.error(t('Enter peers as IP:port'), { description: invalid.length > 0 ? t('Can\'t use: {value}', { value: invalid.join(', ') }) : undefined })
      return
    }

    try {
      const results = await action.mutateAsync({
        work: () => qbitClient.addPeers([hash], valid),
        failed: t('Failed to add peers'),
      }) as Awaited<ReturnType<typeof qbitClient.addPeers>>
      setNewPeers('')
      const { added = 0, failed = 0 } = results[hash] ?? {}
      if (failed > 0) toast.warning(t('Added {added}, couldn\'t add {failed}', { added, failed }), { description: t('The Logs page may say why.') })
      else toast.success(added === 1 ? t('Peer added') : t('Added {added} peers', { added }))
    } catch {
      // The action already showed the error.
    }
  }

  const ban = (address: string) => {
    action.mutateAsync({
      work: () => qbitClient.banPeers([address]),
      failed: t('Failed to ban peer'),
    }).then(() => { toast.success(t('Peer banned')) }, () => undefined)
  }

  const entries = Object.entries(peers ?? {})

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">{t('Loading peers...')}</div>
      ) : isError && !peers ? (
        <div className="py-8 text-center text-muted-foreground">{t('Couldn\'t load peers')}</div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">{t('No peers connected')}</div>
      ) : (
        <ul className="divide-y text-sm">
          {entries.map(([id, peer]) => (
            <li key={id} className="flex items-start gap-2 px-2 py-2">
              <PeerFlag code={peer.country_code} country={peer.country} />
              <div className="min-w-0 flex-1">
                <p className="break-all font-medium tabular-nums" dir="ltr">{peer.ip ?? id}</p>
                {(peer.host_name || peer.country) && (
                  <p className="break-all text-xs text-muted-foreground">{[peer.host_name, peer.country].filter(Boolean).join(' · ')}</p>
                )}
                <PeerFacts peer={peer} />
              </div>
              <ConfirmAction
                label={t('Ban {value}', { value: peer.ip ?? id })}
                title={t('Ban this peer?')}
                message={t('{value} will be banned from every torrent, not only this one. You can undo this with Unban, below the peer list.', { value: peer.ip ?? id })}
                confirmLabel={t('Ban')}
                disabled={action.isPending}
                onConfirm={() => ban(id)}
              >
                <Ban className="h-3.5 w-3.5" />
              </ConfirmAction>
            </li>
          ))}
        </ul>
      )}

      {data && !data.showFlags && entries.length > 0 && (
        <p className="px-2 text-xs text-muted-foreground">{t('To see each peer\'s country, turn on Resolve peer countries in Settings, Advanced.')}</p>
      )}

      <form onSubmit={add} className="space-y-1 border-t px-2 pb-2 pt-3">
        <Label htmlFor="new-peers" className="text-xs text-muted-foreground">{t('Add peers, as IP:port')}</Label>
        <div className="flex gap-2">
          <Input id="new-peers" value={newPeers} placeholder="203.0.113.5:6881" onChange={(e) => setNewPeers(e.target.value)} className="h-8 text-sm" />
          <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>{t('Add')}</Button>
        </div>
      </form>

      <div className="space-y-1 border-t px-2 pb-2 pt-3">
        <h3 className="text-xs text-muted-foreground">{t('Banned peers, across all torrents')}</h3>
        <BannedPeers />
      </div>
    </div>
  )
}
