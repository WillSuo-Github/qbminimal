import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { getTorrentExportUrl } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import type { Torrent } from '@/types'
import { PieceBar } from './PieceBar'

type Row = [label: string, value: string | number | undefined | false]

// Groups of facts about a torrent. Rows without a value, often fields an older qBittorrent
// doesn't send, are left out.
function groups(t: Torrent): { title: string; rows: Row[] }[] {
  const has = (n: number | undefined) => n !== undefined && n >= 0
  return [
    {
      title: 'Transfer',
      rows: [
        ['Progress', `${Math.floor(t.progress * 1000) / 10}% of ${formatBytes(t.size)}`],
        ['Speed', `↓ ${formatBytes(t.dlspeed)}/s · ↑ ${formatBytes(t.upspeed)}/s`],
        ['Downloaded', formatBytes(t.downloaded ?? t.total_downloaded ?? 0)],
        ['Uploaded', formatBytes(t.uploaded)],
        ['Ratio', t.ratio.toFixed(2)],
        ['Seeds', `${t.num_seeds} connected of ${t.num_complete}`],
        ['Peers', `${t.num_leechs} connected of ${t.num_incomplete}`],
        ['Connections', has(t.connections_count) && `${t.connections_count}${t.connections_limit && t.connections_limit > 0 ? ` of ${t.connections_limit}` : ''}`],
        ['Availability', has(t.availability) && t.availability!.toFixed(3)],
        ['Wasted', has(t.total_wasted) && formatBytes(t.total_wasted!)],
        ['Pieces', !!t.pieces_num && `${t.pieces_have ?? 0} of ${t.pieces_num}${t.piece_size ? `, ${formatBytes(t.piece_size)} each` : ''}`],
        ['Queue position', t.priority > 0 ? t.priority : 'Not queued'],
      ],
    },
    {
      title: 'Time',
      rows: [
        ['Added', formatDateTime(t.added_on)],
        ['Completed', t.completion_on > 0 && formatDateTime(t.completion_on)],
        ['Active for', formatDuration(t.time_active)],
        ['Seeding for', t.seeding_time > 0 && formatDuration(t.seeding_time)],
        ['Next announce', has(t.reannounce) && formatDuration(t.reannounce)],
      ],
    },
    {
      title: 'Where',
      rows: [
        ['Save path', t.save_path],
        ['Incomplete files', t.download_path],
        ['Category', t.category || '-'],
        ['Tags', t.tags || '-'],
      ],
    },
    {
      title: 'About',
      rows: [
        ['Private', t.private !== undefined && (t.private ? 'Yes' : 'No')],
        ['Created by', t.created_by],
        ['Created on', !!t.creation_date && t.creation_date > 0 && formatDateTime(t.creation_date)],
        ['Comment', t.comment],
        ['Hash', t.hash],
        ['Hash (v2)', t.infohash_v2],
      ],
    },
  ]
}

export function TorrentInfoTab({ torrent }: { torrent: Torrent }) {
  const copy = async (text: string, what: string) => {
    if (await copyText(text)) toast.success(`${what} copied`)
    else toast.error(`Couldn't copy the ${what.toLowerCase()}`)
  }

  return (
    <div className="space-y-3">
      <PieceBar hash={torrent.hash} torrentComplete={torrent.progress >= 1} />

      {/* Web API 2.17.0 and newer say why a torrent stopped with an error. */}
      {torrent.error && <p role="alert" className="mx-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{torrent.error}</p>}

      <div className="flex flex-wrap gap-2 px-2">
        <Button size="sm" variant="outline" onClick={() => copy(torrent.name, 'Name')}>Copy name</Button>
        <Button size="sm" variant="outline" onClick={() => copy(torrent.hash, 'Hash')}>Copy hash</Button>
        {torrent.magnet_uri && <Button size="sm" variant="outline" onClick={() => copy(torrent.magnet_uri, 'Magnet link')}>Copy magnet link</Button>}
        {torrent.has_metadata === false ? (
          <span className="inline-flex cursor-not-allowed" title="Available once qBittorrent has this torrent's metadata">
            <Button size="sm" variant="outline" disabled>Export .torrent</Button>
          </span>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <a href={getTorrentExportUrl(torrent.hash)} download={`${torrent.name}.torrent`}>Export .torrent</a>
          </Button>
        )}
      </div>

      {groups(torrent).map(group => (
        <section key={group.title}>
          <h3 className="px-2 text-xs font-medium text-muted-foreground">{group.title}</h3>
          <dl className="divide-y text-sm">
            {group.rows.filter((row): row is [string, string | number] => row[1] !== undefined && row[1] !== false && row[1] !== '').map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-2 py-1.5">
                <dt className="flex-shrink-0 text-muted-foreground">{label}</dt>
                <dd className="truncate text-right tabular-nums" title={String(value)}>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
