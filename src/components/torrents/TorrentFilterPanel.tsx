import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/NativeSelect'
import { STATUS_FILTERS, TRACKERLESS, type StatusFilter } from '@/lib/torrentFilters'
import type { TorrentList } from '@/hooks/useTorrentList'

interface TorrentFilterPanelProps {
  list: TorrentList
  categories: string[]
  tags: string[]
  onManage: () => void
}

// Name search plus status, category, tag, and tracker, each choice showing how many it would match.
export function TorrentFilterPanel({ list, categories, tags, onManage }: TorrentFilterPanelProps) {
  const { filters, setFilter, counts, trackerHosts } = list
  const withCount = (label: string, count = 0) => `${label} (${count})`

  return (
    <div id="torrent-filters" className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
      <Input type="search" autoFocus aria-label="Filter by name" placeholder="Filter by name" value={filters.name} onChange={(e) => setFilter('name', e.target.value)} className="col-span-2 h-9 md:w-64" />
      <NativeSelect aria-label="Filter by status" className="col-span-2" value={filters.status} onChange={(e) => setFilter('status', e.target.value as StatusFilter)}>
        {STATUS_FILTERS.map(({ value, label }) => <option key={value} value={value}>{withCount(label, counts.status[value])}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Filter by category" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
        <option value="">All categories</option>
        {categories.map(name => <option key={name} value={name}>{withCount(name, counts.category[name])}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Filter by tag" value={filters.tag} onChange={(e) => setFilter('tag', e.target.value)}>
        <option value="">All tags</option>
        {tags.map(name => <option key={name} value={name}>{withCount(name, counts.tag[name])}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Filter by tracker" className="col-span-2" value={filters.tracker} onChange={(e) => setFilter('tracker', e.target.value)}>
        <option value="">All trackers</option>
        <option value={TRACKERLESS}>{withCount('Trackerless', counts.trackerless)}</option>
        {trackerHosts.map(host => <option key={host} value={host}>{withCount(host, counts.tracker[host])}</option>)}
      </NativeSelect>
      <Button type="button" variant="ghost" size="sm" className="col-span-2 justify-start md:col-span-1" onClick={onManage}>Manage categories and tags</Button>
    </div>
  )
}
