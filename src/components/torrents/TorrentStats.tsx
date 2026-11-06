import { useState, type ReactNode } from 'react'
import { Globe, HardDrive, Network, Pause, Play } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useApiFeature, useTransferInfo } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'

const CONNECTION_LABELS: Record<string, { label: string; description: string; dot: string; text: string }> = {
  connected: { label: 'Connected', description: 'Other peers can reach qBittorrent', dot: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
  firewalled: { label: 'Firewalled', description: "Peers can't connect in, so only outgoing connections work", dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  disconnected: { label: 'Disconnected', description: 'qBittorrent has no network connection', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
}

const size = (bytes: number | undefined) => (bytes === undefined ? '-' : formatBytes(bytes))
const count = (value: number | undefined) => (value === undefined ? '-' : value.toLocaleString())
const limit = (bytes: number | undefined) => (bytes === undefined ? '-' : bytes > 0 ? `${formatBytes(bytes)}/s` : 'Unlimited')

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted/60 px-3 py-2">
      <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm tabular-nums" title={value}>{value}</p>
      </div>
    </div>
  )
}

// qBittorrent's connection status and statistics. The trigger is the torrent count above the list.
// qBittorrent 5.3 can pause every transfer at once and later resume exactly what was running.
function SessionPauseButton({ paused }: { paused: boolean }) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)

  const toggle = async () => {
    setPending(true)
    try {
      await (paused ? qbitClient.resumeSession() : qbitClient.pauseSession())
      await queryClient.invalidateQueries({ queryKey: ['torrents'] })
      toast.success(paused ? 'Transfers resumed' : 'All transfers paused', { description: paused ? undefined : 'Each torrent keeps its own state, so resuming brings back what was running.' })
    } catch (e) {
      toast.error(paused ? "Couldn't resume transfers" : "Couldn't pause transfers", { description: e instanceof Error ? e.message : undefined })
    } finally {
      setPending(false)
    }
  }

  return (
    <Button type="button" size="sm" variant={paused ? 'default' : 'outline'} disabled={pending} onClick={toggle} className="w-full gap-2">
      {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      {paused ? 'Resume all transfers' : 'Pause all transfers'}
    </Button>
  )
}

export function TorrentStats({ children }: { children: ReactNode }) {
  const { data: state } = useTransferInfo()
  const canPauseSession = useApiFeature('sessionPause') && typeof state?.session_state === 'boolean'
  const sessionPaused = state?.session_state === true
  const connection = CONNECTION_LABELS[state?.connection_status ?? '']
  const externalAddress = [state?.last_external_address_v4, state?.last_external_address_v6].filter(Boolean).join(', ')

  const allGroups: { title: string; rows: [string, string][] }[] = state ? [
    {
      title: 'All time',
      rows: [
        ['Downloaded', size(state.alltime_dl)],
        ['Uploaded', size(state.alltime_ul)],
        ['Ratio', state.global_ratio ?? '-'],
      ],
    },
    {
      title: 'This session',
      rows: [
        ['Downloaded', size(state.dl_info_data)],
        ['Uploaded', size(state.up_info_data)],
        ['Wasted', size(state.total_wasted_session)],
        ['Connected peers', count(state.total_peer_connections)],
        ['Download limit', limit(state.dl_rate_limit)],
        ['Upload limit', limit(state.up_rate_limit)],
      ],
    },
    {
      title: 'Cache and disk',
      rows: [
        ['Read cache hits', state.read_cache_hits !== undefined ? `${state.read_cache_hits}%` : '-'],
        ['Read cache overload', state.read_cache_overload !== undefined ? `${state.read_cache_overload}%` : '-'],
        ['Write cache overload', state.write_cache_overload !== undefined ? `${state.write_cache_overload}%` : '-'],
        ['Total buffer size', size(state.total_buffers_size)],
        ['Queued disk jobs', count(state.queued_io_jobs)],
        ['Average time in queue', state.average_time_queue === undefined ? '-' : `${state.average_time_queue} ms`],
        ['Total queued size', size(state.total_queued_size)],
      ],
    },
  ] : []
  // Rows this qBittorrent doesn't report are left out, and so is a group left empty.
  const groups = allGroups
    .map(group => ({ ...group, rows: group.rows.filter(([, value]) => value !== '-') }))
    .filter(group => group.rows.length > 0)

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statistics</DialogTitle>
        </DialogHeader>

        {!state ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading statistics...</p>
        ) : (
          <>
            <div className={cn('space-y-2.5 rounded-md border px-3 py-2.5', !connection && 'text-muted-foreground')}>
              <div className="flex items-center gap-3">
                <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', sessionPaused ? 'bg-muted-foreground' : connection?.dot ?? 'bg-muted-foreground')} aria-hidden />
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', !sessionPaused && connection?.text)}>
                    {connection?.label ?? 'Connection status unknown'}{sessionPaused && ', all transfers paused'}
                  </p>
                  {connection && <p className="text-xs text-muted-foreground">{connection.description}</p>}
                </div>
              </div>
              {canPauseSession && <SessionPauseButton paused={sessionPaused} />}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Fact icon={<HardDrive className="h-4 w-4" />} label="Free space" value={size(state.free_space_on_disk)} />
              <Fact icon={<Network className="h-4 w-4" />} label="DHT nodes" value={count(state.dht_nodes)} />
              {externalAddress && (
                <div className="col-span-2">
                  <Fact icon={<Globe className="h-4 w-4" />} label="External address" value={externalAddress} />
                </div>
              )}
            </div>

            {groups.map(group => (
              <section key={group.title}>
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">{group.title}</h3>
                <dl className="divide-y text-sm">
                  {group.rows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 py-1.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {state.average_time_queue !== undefined && state.average_time_queue > 5000 && (
              <p className="text-xs text-amber-500">Disk jobs are waiting {formatDuration(state.average_time_queue / 1000)} on average, so the disk may be slowing transfers.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
