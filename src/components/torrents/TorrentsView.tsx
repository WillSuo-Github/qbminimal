import { lazy, useState, type MouseEvent } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/NativeSelect'
import { PageBoundary } from '@/components/PageBoundary'
import { PageHeader } from '@/components/PageHeader'
import { useCategories, useDeleteTorrents, usePauseTorrents, useResumeTorrents, useTags, useTorrents, useTrackerMap } from '@/hooks/useApi'
import { useTorrentList } from '@/hooks/useTorrentList'
import { PAGE_SIZES } from '@/lib/listSettings'
import { loadColumnLayout, saveColumnLayout, type ColumnLayout } from '@/lib/torrentColumns'
import type { Torrent } from '@/types'
import { BulkActions } from './BulkActions'
import { DeleteTorrentsDialog, type DeleteRequest } from './DeleteTorrentsDialog'
import { RowActions } from './RowActions'
import { TorrentCards } from './TorrentCards'
import { TorrentFilterPanel } from './TorrentFilterPanel'
import { TorrentStats } from './TorrentStats'
import { TorrentTable } from './TorrentTable'
import { TorrentToolbar } from './TorrentToolbar'

const CategoriesTagsDialog = lazy(() => import('./CategoriesTagsDialog').then(m => ({ default: m.CategoriesTagsDialog })))
const TorrentDetailsDialog = lazy(() => import('./TorrentDetailsDialog').then(m => ({ default: m.TorrentDetailsDialog })))

const EMPTY: Torrent[] = []

export function TorrentsView() {
  const { data: torrents = EMPTY, isLoading, isError } = useTorrents()
  const { data: trackerMap } = useTrackerMap()
  const { data: categories } = useCategories()
  const { data: tags } = useTags()
  const list = useTorrentList(torrents, trackerMap)
  const pause = usePauseTorrents()
  const resume = useResumeTorrents()
  const remove = useDeleteTorrents()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [detailsHash, setDetailsHash] = useState<string | null>(null)
  const [columns, setColumns] = useState<ColumnLayout>(loadColumnLayout)
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Looked up on every refresh, so open details stay current.
  const detailsTorrent = torrents.find(t => t.hash === detailsHash)
  const selectedTorrents = torrents.filter(t => selected.has(t.hash))

  const changeColumns = (layout: ColumnLayout) => {
    setColumns(layout)
    saveColumnLayout(layout)
  }

  const select = (hash: string, checked: boolean) => setSelected(current => {
    const next = new Set(current)
    if (checked) next.add(hash)
    else next.delete(hash)
    return next
  })
  const selectAll = (checked: boolean) => setSelected(checked ? new Set(list.matching.map(t => t.hash)) : new Set())

  const askToDelete = (targets: Torrent[], withFiles: boolean) => {
    setDeleteRequest({ torrents: targets, withFiles })
    setDeleteOpen(true)
  }
  const confirmDelete = ({ torrents: targets, withFiles }: DeleteRequest) => {
    const hashes = targets.map(t => t.hash)
    remove.mutate({ hashes, deleteFiles: withFiles })
    setSelected(current => new Set([...current].filter(hash => !hashes.includes(hash))))
    setDeleteOpen(false)
  }

  const runOnSelection = (action: typeof pause) => {
    action.mutate([...selected])
    setSelected(new Set())
  }

  // Double-clicking a row or card opens its details, unless it was on one of its controls.
  const openFromRow = (event: MouseEvent, torrent: Torrent) => {
    if ((event.target as HTMLElement).closest('button, a, input, label, [role="menuitem"]')) return
    window.getSelection()?.removeAllRanges()
    setDetailsHash(torrent.hash)
  }

  const actions = (torrent: Torrent, compact?: boolean) => (
    <RowActions torrent={torrent} compact={compact} onDetails={t => setDetailsHash(t.hash)} onDelete={askToDelete} />
  )

  const total = torrents.length
  const header = (
    <PageHeader
      title="Torrents"
      description={!isLoading && (
        // The count opens the connection status and statistics.
        <TorrentStats>
          <button type="button" className="underline-offset-4 hover:text-foreground hover:underline" title="Show connection status and statistics">
            {list.filtered ? `${list.matching.length} of ${total} torrents` : `${total} ${total === 1 ? 'torrent' : 'torrents'}`}
          </button>
        </TorrentStats>
      )}
      actions={total > 0 && <TorrentToolbar list={list} filtersOpen={filtersOpen} onToggleFilters={() => setFiltersOpen(open => !open)} columns={columns} onColumnsChange={changeColumns} />}
    />
  )

  const notice = isLoading ? 'Loading torrents...'
    : isError && total === 0 ? "Couldn't load torrents. Check the connection to qBittorrent."
    : total === 0 ? 'No torrents yet. Add one from the Add page.'
    : null
  if (notice) {
    return (
      <div className="space-y-4">
        {header}
        <p className="py-8 text-center text-muted-foreground">{notice}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}

      {selected.size > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-muted p-2">
          <span className="whitespace-nowrap text-sm">{selected.size} selected</span>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => runOnSelection(resume)}><Play className="h-4 w-4" /> Resume</Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => runOnSelection(pause)}><Pause className="h-4 w-4" /> Pause</Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => askToDelete(selectedTorrents, false)}><Trash2 className="h-4 w-4" /> Delete</Button>
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => askToDelete(selectedTorrents, true)}><Trash2 className="h-4 w-4" /> Delete + Files</Button>
          <BulkActions torrents={selectedTorrents} />
        </div>
      )}

      {filtersOpen && <TorrentFilterPanel list={list} categories={Object.keys(categories ?? {})} tags={tags ?? []} onManage={() => setManageOpen(true)} />}

      {list.matching.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <span>No torrents match these filters</span>
          <Button variant="outline" size="sm" onClick={list.clearFilters}>Clear filters</Button>
        </div>
      ) : list.showTable ? (
        <TorrentTable
          torrents={list.rows}
          layout={columns}
          onLayoutChange={changeColumns}
          selected={selected}
          allSelected={selected.size === list.matching.length}
          onSelect={select}
          onSelectAll={selectAll}
          sortField={list.sort.field}
          sortDirection={list.sort.direction}
          onSort={list.sortBy}
          onRowDoubleClick={openFromRow}
          renderActions={t => actions(t)}
        />
      ) : (
        <TorrentCards torrents={list.rows} selected={selected} onSelect={select} onOpen={openFromRow} actions={t => actions(t, true)} />
      )}

      {list.matching.length > PAGE_SIZES[0] && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Show
            <NativeSelect className="h-8 text-foreground" value={list.pageSize} onChange={(e) => list.setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
            </NativeSelect>
            per page
          </label>
          {list.pageCount > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" aria-label="Previous page" disabled={list.page === 1} onClick={() => list.setPage(list.page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm tabular-nums">{list.page} / {list.pageCount}</span>
              <Button variant="outline" size="sm" aria-label="Next page" disabled={list.page === list.pageCount} onClick={() => list.setPage(list.page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </div>
      )}

      <DeleteTorrentsDialog request={deleteRequest} open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={confirmDelete} />

      {manageOpen && (
        <PageBoundary loading={null}>
          <CategoriesTagsDialog open onOpenChange={setManageOpen} />
        </PageBoundary>
      )}
      {detailsTorrent && (
        <PageBoundary loading={null}>
          <TorrentDetailsDialog torrent={detailsTorrent} onClose={() => setDetailsHash(null)} />
        </PageBoundary>
      )}
    </div>
  )
}
