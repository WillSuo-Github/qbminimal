import { useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { columnWidth, getColumn, moveColumn, resizeColumn, shiftColumn, trackerHost, visibleColumns, type ColumnId, type ColumnLayout } from '@/lib/torrentColumns'
import { formatEta, getStateBadge, getStateLabel, ratioColor } from '@/lib/torrentState'
import type { SortDirection } from '@/lib/listSettings'
import type { Torrent } from '@/types'

const SELECT_WIDTH = 40
const ACTIONS_WIDTH = 120
// The checkbox and the action buttons stay in view while the other columns scroll sideways.
// Their background has to be solid, so it mixes the row's hover tint into the card color.
const PINNED_LEFT = 'sticky left-0 z-10 bg-card group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]'
const PINNED_RIGHT = 'sticky right-0 z-10 bg-card shadow-[-1px_0_0_var(--border)] group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--card))]'
const PINNED_SELECTED = 'bg-muted group-hover:bg-muted'

const speed = (bytes: number) => (bytes > 0 ? `${formatBytes(bytes)}/s` : <span className="text-muted-foreground/60">-</span>)
const limit = (bytes: number) => (bytes > 0 ? `${formatBytes(bytes)}/s` : '∞')
const pair = (connected: number, total: number) => `${Math.max(connected, 0)} (${Math.max(total, 0)})`

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
          <span className="w-10 flex-shrink-0 text-right text-xs">{percent >= 100 ? '100' : percent.toFixed(1)}</span>
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
    case 'dlspeed': return speed(torrent.dlspeed)
    case 'upspeed': return speed(torrent.upspeed)
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
    case 'priority': return torrent.priority > 0 ? torrent.priority : '-'
    case 'dl_limit': return limit(torrent.dl_limit)
    case 'up_limit': return limit(torrent.up_limit)
    case 'save_path': return <span title={torrent.save_path}>{torrent.save_path}</span>
  }
}

interface TorrentTableProps {
  torrents: Torrent[]
  layout: ColumnLayout
  onLayoutChange: (layout: ColumnLayout) => void
  selected: Set<string>
  allSelected: boolean
  onSelect: (hash: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  sortField: ColumnId
  sortDirection: SortDirection
  onSort: (field: ColumnId) => void
  onRowDoubleClick: (e: MouseEvent, torrent: Torrent) => void
  renderActions: (torrent: Torrent) => ReactNode
}

// A table whose columns can be dragged to a new place, resized from their right edge, sorted by
// clicking, and shown or hidden from the Columns menu. Alt + arrow keys on a header move it too.
export function TorrentTable({ torrents, layout, onLayoutChange, selected, allSelected, onSelect, onSelectAll, sortField, sortDirection, onSort, onRowDoubleClick, renderActions }: TorrentTableProps) {
  const columns = visibleColumns(layout)
  const [resizing, setResizing] = useState<{ id: ColumnId; width: number } | null>(null)
  const resizeStart = useRef<{ x: number; width: number } | null>(null)
  const [dragging, setDragging] = useState<ColumnId | null>(null)
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null)

  const widthOf = (id: ColumnId) => (resizing?.id === id ? resizing.width : columnWidth(layout, id))
  const total = SELECT_WIDTH + ACTIONS_WIDTH + columns.reduce((sum, def) => sum + widthOf(def.id), 0)

  const startResize = (e: PointerEvent<HTMLSpanElement>, id: ColumnId) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeStart.current = { x: e.clientX, width: widthOf(id) }
    setResizing({ id, width: widthOf(id) })
  }
  const moveResize = (e: PointerEvent<HTMLSpanElement>, id: ColumnId) => {
    if (!resizeStart.current || resizing?.id !== id) return
    const def = getColumn(id)
    setResizing({ id, width: Math.max(def.minWidth, resizeStart.current.width + e.clientX - resizeStart.current.x) })
  }
  const endResize = () => {
    if (resizing) onLayoutChange(resizeColumn(layout, resizing.id, resizing.width))
    resizeStart.current = null
    setResizing(null)
  }
  // Double-clicking the edge puts the column back to its usual width.
  const resetWidth = (id: ColumnId) => {
    const widths = { ...layout.widths }
    delete widths[id]
    onLayoutChange({ ...layout, widths })
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
    onLayoutChange(shiftColumn(layout, id, e.key === 'ArrowLeft' ? -1 : 1))
  }

  const dragIndex = dragging ? columns.findIndex(def => def.id === dragging) : -1

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="table-fixed caption-bottom text-sm tabular-nums" style={{ width: `max(100%, ${total}px)` }}>
        <colgroup>
          <col style={{ width: SELECT_WIDTH }} />
          {columns.map(def => <col key={def.id} style={{ width: widthOf(def.id) }} />)}
          {/* Takes any room left over, so the actions stay at the right edge. */}
          <col />
          <col style={{ width: ACTIONS_WIDTH }} />
        </colgroup>
        <thead className="border-b">
          <tr>
            <th className="sticky left-0 z-10 h-10 bg-card px-2 text-left">
              <Checkbox aria-label="Select all" checked={allSelected} onCheckedChange={(checked) => onSelectAll(!!checked)} />
            </th>
            {columns.map((def, index) => {
              const sorted = sortField === def.id
              // The drop marker shows on the side the column will land.
              const marker = dropTarget === def.id && dragging && dragging !== def.id ? (index < dragIndex ? 'before' : 'after') : null
              return (
                <th
                  key={def.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, def.id)}
                  onDragOver={(e) => onDragOver(e, def.id)}
                  onDragLeave={() => setDropTarget(target => (target === def.id ? null : target))}
                  onDrop={(e) => onDrop(e, def.id)}
                  onDragEnd={() => { setDragging(null); setDropTarget(null) }}
                  aria-sort={sorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'relative h-10 select-none px-2 text-left align-middle font-medium text-muted-foreground',
                    dragging === def.id && 'opacity-50',
                    marker === 'before' && 'shadow-[inset_2px_0_0_var(--color-primary)]',
                    marker === 'after' && 'shadow-[inset_-2px_0_0_var(--color-primary)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSort(def.id)}
                    onKeyDown={(e) => onHeaderKey(e, def.id)}
                    title={`Sort by ${def.label}. Drag to move, or press Alt and an arrow key.`}
                    className={cn('flex w-full min-w-0 cursor-grab items-center gap-1 hover:text-foreground active:cursor-grabbing', def.numeric && 'justify-end', sorted && 'text-foreground')}
                  >
                    <span className="truncate">{def.label}</span>
                    {sorted && (sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 flex-shrink-0" /> : <ArrowDown className="h-3.5 w-3.5 flex-shrink-0" />)}
                  </button>
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${def.label}`}
                    title="Drag to resize. Double-click to reset."
                    onPointerDown={(e) => startResize(e, def.id)}
                    onPointerMove={(e) => moveResize(e, def.id)}
                    onPointerUp={endResize}
                    onPointerCancel={endResize}
                    onDoubleClick={() => resetWidth(def.id)}
                    className="group absolute right-0 top-0 flex h-full w-2 cursor-col-resize touch-none justify-end"
                  >
                    <span className={cn('h-full w-px', resizing?.id === def.id ? 'bg-primary' : 'bg-border group-hover:bg-primary/60')} />
                  </span>
                </th>
              )
            })}
            <th aria-hidden />
            <th className="sticky right-0 z-10 h-10 bg-card px-2 shadow-[-1px_0_0_var(--border)]"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {torrents.map(torrent => {
            const isSelected = selected.has(torrent.hash)
            return (
            <tr
              key={torrent.hash}
              className={cn('group cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50', isSelected && 'bg-muted')}
              onDoubleClick={(e) => onRowDoubleClick(e, torrent)}
            >
              <td className={cn('px-2 py-1.5', PINNED_LEFT, isSelected && PINNED_SELECTED)}>
                <Checkbox aria-label={`Select ${torrent.name}`} checked={isSelected} onCheckedChange={(checked) => onSelect(torrent.hash, !!checked)} />
              </td>
              {columns.map(def => (
                <td key={def.id} className={cn('truncate px-2 py-1.5 whitespace-nowrap', def.numeric && 'text-right', def.id === 'name' && 'text-xs font-medium')}>
                  <Cell torrent={torrent} id={def.id} />
                </td>
              ))}
              <td aria-hidden />
              <td className={cn('px-2 py-1', PINNED_RIGHT, isSelected && PINNED_SELECTED)}>{renderActions(torrent)}</td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
