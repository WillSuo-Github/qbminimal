import { useRef, useState, type DragEvent, type HTMLAttributes, type KeyboardEvent, type PointerEvent, type ReactElement, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { ContextMenu, ContextMenuCheckboxItem, ContextMenuContent, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { canToggleColumn, columnWidth, getColumn, moveColumn, resizeColumn, shiftColumn, toggleColumn, trackerHost, visibleColumns, type ColumnId, type ColumnLayout } from '@/lib/torrentColumns'
import { DOWN_SPEED_COLOR, formatEta, getStateBadge, getStateLabel, ratioColor, UP_SPEED_COLOR, peerPair as pair } from '@/lib/torrentState'
import type { SortDirection } from '@/lib/listSettings'
import type { Torrent } from '@/types'
import { useTransferInfo } from '@/hooks/useApi'
import { BottomScrollbar } from './BottomScrollbar'
import { t } from '@/i18n'

// Columns of words follow the language's direction; other columns are numbers or paths.
const WORD_COLUMNS: ReadonlySet<ColumnId> = new Set(['name', 'state', 'category', 'tags'])

export type RowProps = HTMLAttributes<HTMLElement> & { 'data-hash'?: string }

// A dash in place of a speed of zero, so the moving torrents stand out.
const speed = (bytes: number, color: string) => (bytes > 0 ? <span className={color}>{formatBytes(bytes)}/s</span> : <span className="text-muted-foreground/60">-</span>)
const limit = (bytes: number) => (bytes > 0 ? `${formatBytes(bytes)}/s` : '∞')

function Cell({ torrent, id }: { torrent: Torrent; id: ColumnId }): ReactNode {
  switch (id) {
    case 'name': return <span title={torrent.name}>{torrent.name}</span>
    case 'size': return formatBytes(torrent.size)
    case 'progress': {
      const percent = Math.floor(torrent.progress * 1000) / 10
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${torrent.progress * 100}%` }} />
          </div>
          <span className="w-10 flex-shrink-0 text-end text-xs">{percent >= 100 ? '100' : percent.toFixed(1)}</span>
        </div>
      )
    }
    case 'state':
      return (
        <span className={cn('inline-block max-w-full truncate rounded px-1.5 py-0.5 text-xs font-medium', getStateBadge(torrent.state, torrent.completion_on))} title={torrent.error || undefined}>
          {getStateLabel(torrent.state, torrent.completion_on)}
        </span>
      )
    case 'num_seeds': return pair(torrent.num_seeds, torrent.num_complete)
    case 'num_leechs': return pair(torrent.num_leechs, torrent.num_incomplete)
    case 'dlspeed': return speed(torrent.dlspeed, DOWN_SPEED_COLOR)
    case 'upspeed': return speed(torrent.upspeed, UP_SPEED_COLOR)
    case 'eta': return formatEta(torrent.eta)
    case 'ratio': return <span className={ratioColor(torrent.ratio)}>{torrent.ratio.toFixed(2)}</span>
    case 'category': return <span title={torrent.category}>{torrent.category}</span>
    case 'tags': return <span title={torrent.tags}>{torrent.tags}</span>
    case 'added_on': return formatDateTime(torrent.added_on)
    case 'completion_on': return formatDateTime(torrent.completion_on)
    case 'tracker': return <span title={torrent.tracker}>{trackerHost(torrent.tracker)}</span>
    case 'downloaded': return formatBytes(torrent.downloaded ?? torrent.total_downloaded ?? 0)
    case 'uploaded': return formatBytes(torrent.uploaded ?? 0)
    case 'amount_left': return formatBytes(torrent.amount_left ?? 0)
    case 'time_active': return formatDuration(torrent.time_active)
    case 'seeding_time': return formatDuration(torrent.seeding_time)
    case 'last_activity': return formatDateTime(torrent.last_activity)
    case 'availability': return torrent.availability !== undefined && torrent.availability >= 0 ? torrent.availability.toFixed(2) : '-'
    // qBittorrent's * for a torrent outside the queue.
    case 'priority': return torrent.priority > 0 ? torrent.priority : <span className="text-muted-foreground/60">*</span>
    case 'popularity': return torrent.popularity === undefined ? '-' : torrent.popularity < 0 ? '∞' : torrent.popularity.toFixed(2)
    case 'dl_limit': return limit(torrent.dl_limit)
    case 'up_limit': return limit(torrent.up_limit)
    case 'save_path': return <span title={torrent.save_path}>{torrent.save_path}</span>
  }
}

interface TorrentTableProps {
  torrents: Torrent[]
  layout: ColumnLayout
  onLayoutChange: (layout: ColumnLayout) => void
  // The torrent shown in the details panel, marked in the list.
  openHash: string | null
  sortField: ColumnId
  sortDirection: SortDirection
  onSort: (field: ColumnId) => void
  // Click, long-press, and right-click handlers for a row.
  rowProps: (torrent: Torrent) => RowProps
  // Wraps the table body, for the right-click menu.
  wrapBody: (body: ReactElement) => ReactNode
}

// The width that shows every given cell's content whole: each is copied, unclipped, into a hidden
// box beside the table, which keeps the table's fonts.
function naturalWidth(cells: Element[], host: HTMLElement): number {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;width:max-content;white-space:nowrap'
  host.appendChild(probe)
  let widest = 0
  for (const cell of cells) {
    probe.className = cell.className
    probe.innerHTML = cell.innerHTML
    widest = Math.max(widest, probe.getBoundingClientRect().width)
  }
  probe.remove()
  return Math.ceil(widest)
}

// A table whose columns can be dragged to a new place, resized from their right edge, sorted by
// clicking, and shown or hidden from the Columns menu. Alt + arrow keys on a header move it too.
export function TorrentTable({ torrents, layout, onLayoutChange, openHash, sortField, sortDirection, onSort, rowProps, wrapBody }: TorrentTableProps) {
  const { data: serverState } = useTransferInfo()
  // qBittorrent hides its # column while queueing is off, when every torrent would show *.
  const visible = visibleColumns(layout)
  const columns = visible.filter(def => def.id !== 'priority' || serverState?.queueing !== false || visible.length === 1)
  const [resizing, setResizing] = useState<{ id: ColumnId; width: number } | null>(null)
  // sign is -1 right to left, where a column's resizing edge is on its left.
  const resizeStart = useRef<{ x: number; width: number; sign: number } | null>(null)
  const [dragging, setDragging] = useState<ColumnId | null>(null)
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  const widthOf = (id: ColumnId) => (resizing?.id === id ? resizing.width : columnWidth(layout, id))
  const total = columns.reduce((sum, def) => sum + widthOf(def.id), 0)

  const startResize = (e: PointerEvent<HTMLSpanElement>, id: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeStart.current = { x: e.clientX, width: widthOf(id), sign: getComputedStyle(e.currentTarget).direction === 'rtl' ? -1 : 1 }
    setResizing({ id, width: widthOf(id) })
  }
  const moveResize = (e: PointerEvent<HTMLSpanElement>, id: ColumnId) => {
    if (!resizeStart.current || resizing?.id !== id) return
    const def = getColumn(id)
    setResizing({ id, width: Math.max(def.minWidth, resizeStart.current.width + (e.clientX - resizeStart.current.x) * resizeStart.current.sign) })
  }
  const endResize = () => {
    if (resizing) onLayoutChange(resizeColumn(layout, resizing.id, resizing.width))
    resizeStart.current = null
    setResizing(null)
  }
  // Double-clicking the edge fits the column to its widest value on this page, and to its header.
  const fitWidth = (id: ColumnId) => {
    const host = scroller.current
    const index = columns.findIndex(def => def.id === id)
    if (!host || index === -1) return
    const cells = [...host.querySelectorAll('tbody tr')].map(row => row.children[index]).filter(Boolean)
    const header = host.querySelectorAll('thead th')[index]
    // Room for the sort arrow, so sorting by the column later doesn't cut its header.
    const headerWidth = header ? naturalWidth([header], host) + 18 : 0
    onLayoutChange(resizeColumn(layout, id, Math.max(naturalWidth(cells, host), headerWidth) + 1))
  }

  const onDragStart = (e: DragEvent<HTMLTableCellElement>, id: ColumnId) => {
    if (resizeStart.current) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDragging(id)
  }
  const onDragOver = (e: DragEvent<HTMLTableCellElement>, id: ColumnId) => {
    if (!dragging) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dropTarget !== id) setDropTarget(id)
  }
  const onDrop = (e: DragEvent<HTMLTableCellElement>, id: ColumnId) => {
    e.preventDefault()
    if (dragging) onLayoutChange(moveColumn(layout, dragging, id))
    setDragging(null)
    setDropTarget(null)
  }
  const onHeaderKey = (e: KeyboardEvent<HTMLButtonElement>, id: ColumnId) => {
    if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return
    e.preventDefault()
    // The arrow points where the column goes on screen, which is backwards right to left.
    const towardsStart = (e.key === 'ArrowLeft') !== (getComputedStyle(e.currentTarget).direction === 'rtl')
    onLayoutChange(shiftColumn(layout, id, towardsStart ? -1 : 1))
  }

  const dragIndex = dragging ? columns.findIndex(def => def.id === dragging) : -1

  return (
    // Its own scrollbar is hidden: the one at the bottom of the screen stands in for it.
    <div ref={scroller} className="overflow-x-auto overscroll-x-none rounded-xl border bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <table className="table-fixed caption-bottom text-sm tabular-nums" style={{ width: `max(100%, ${total}px)` }}>
        <colgroup>
          {columns.map(def => <col key={def.id} style={{ width: widthOf(def.id) }} />)}
          {/* Takes any room left over, so the columns keep their widths. */}
          <col />
        </colgroup>
        <thead className="border-b">
          <tr>
            {columns.map((def, index) => {
              const sorted = sortField === def.id
              // The drop marker shows on the side the column will land.
              const marker = dropTarget === def.id && dragging && dragging !== def.id ? (index < dragIndex ? 'before' : 'after') : null
              return (
                <ContextMenu key={def.id}>
                  <ContextMenuTrigger asChild>
                    <th
                      draggable
                      onDragStart={(e) => onDragStart(e, def.id)}
                      onDragOver={(e) => onDragOver(e, def.id)}
                      onDragLeave={() => setDropTarget(target => (target === def.id ? null : target))}
                      onDrop={(e) => onDrop(e, def.id)}
                      onDragEnd={() => { setDragging(null); setDropTarget(null) }}
                      aria-label={def.label}
                      aria-sort={sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn(
                        'relative h-10 select-none px-2 text-start align-middle font-medium text-muted-foreground',
                        dragging === def.id && 'opacity-50',
                        marker === 'before' && 'shadow-[inset_2px_0_0_var(--color-primary)]',
                        marker === 'after' && 'shadow-[inset_-2px_0_0_var(--color-primary)]',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(def.id)}
                        onKeyDown={(e) => onHeaderKey(e, def.id)}
                        title={t('Sort by {label}. Drag to move, or press Alt and an arrow key.', { label: def.label })}
                        aria-label={def.header ? def.label : undefined}
                        className={cn('flex w-full min-w-0 cursor-grab items-center gap-1 hover:text-foreground active:cursor-grabbing', def.numeric && 'justify-end', sorted && 'text-foreground')}
                      >
                        <span className="truncate">{def.header ?? def.label}</span>
                        {sorted && (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 flex-shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 flex-shrink-0" />)}
                      </button>
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t('Resize {label}', { label: def.label })}
                        title={t('Drag to resize. Double-click to fit the content.')}
                        onPointerDown={(e) => startResize(e, def.id)}
                        onPointerMove={(e) => moveResize(e, def.id)}
                        onPointerUp={endResize}
                        onPointerCancel={endResize}
                        onDoubleClick={() => fitWidth(def.id)}
                        className="group absolute end-0 top-0 flex h-full w-2 cursor-col-resize touch-none justify-end"
                      >
                        <span className={cn('h-full w-px', resizing?.id === def.id ? 'bg-primary' : 'bg-border group-hover:bg-primary/60')} />
                      </span>
                    </th>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    <ContextMenuLabel>{t('Columns')}</ContextMenuLabel>
                    <ContextMenuSeparator />
                    {layout.order.map(id => (
                      <ContextMenuCheckboxItem
                        key={id}
                        checked={!layout.hidden.includes(id)}
                        disabled={!canToggleColumn(layout, id)}
                        onCheckedChange={() => onLayoutChange(toggleColumn(layout, id))}
                      >
                        {getColumn(id).label}
                      </ContextMenuCheckboxItem>
                    ))}
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
            <th aria-hidden />
          </tr>
        </thead>
        {wrapBody(
          <tbody>
            {torrents.map(torrent => {
              return (
                <tr
                  key={torrent.hash}
                  {...rowProps(torrent)}
                  className={cn(
                    'group cursor-default border-b transition-colors outline-none select-none last:border-0 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary [-webkit-touch-callout:none]',
                    openHash === torrent.hash && 'shadow-[inset_3px_0_0_var(--color-primary)] rtl:shadow-[inset_-3px_0_0_var(--color-primary)]',
                  )}
                >
                  {columns.map(def => (
                    <td key={def.id} className={cn('truncate px-2 py-1.5 whitespace-nowrap', def.numeric && 'text-end', def.id === 'name' && 'text-xs font-medium')}>
                      {/* Numbers, sizes, dates and paths read left to right, also in a right-to-left language. */}
                      {WORD_COLUMNS.has(def.id) ? <Cell torrent={torrent} id={def.id} /> : <span dir="ltr"><Cell torrent={torrent} id={def.id} /></span>}
                    </td>
                  ))}
                  <td aria-hidden />
                </tr>
              )
            })}
          </tbody>,
        )}
      </table>
      <BottomScrollbar target={scroller} />
    </div>
  )
}
