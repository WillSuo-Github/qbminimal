import { STATUS_FILTERS, type StatusFilter } from './torrentFilters'
import { COLUMN_IDS, type ColumnId } from './torrentColumns'

// The torrent list's sort, filters, view, and page size, kept per device so the list opens the way it was left.
export type SortField = ColumnId
export type SortDirection = 'asc' | 'desc'
// 'auto' shows the table on wide screens and cards on phones.
export type ListView = 'auto' | 'table' | 'cards'
export const PAGE_SIZES = [20, 50, 100, 250] as const

export interface ListSettings {
  sortField: SortField
  sortDirection: SortDirection
  status: StatusFilter
  category: string
  tag: string
  tracker: string
  view: ListView
  pageSize: number
}

export const DEFAULT_LIST_SETTINGS: ListSettings = { sortField: 'name', sortDirection: 'asc', status: 'all', category: '', tag: '', tracker: '', view: 'auto', pageSize: 20 }

const STORAGE_KEY = 'qbminimal.torrentList'

// Anything unreadable or out of date falls back to the defaults, one value at a time.
export function parseListSettings(raw: string | null): ListSettings {
  let saved: Record<string, unknown> = {}
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (parsed && typeof parsed === 'object') saved = parsed as Record<string, unknown>
  } catch {
    return DEFAULT_LIST_SETTINGS
  }
  const text = (key: keyof ListSettings) => (typeof saved[key] === 'string' ? saved[key] as string : DEFAULT_LIST_SETTINGS[key] as string)
  return {
    sortField: COLUMN_IDS.includes(saved.sortField as SortField) ? saved.sortField as SortField : DEFAULT_LIST_SETTINGS.sortField,
    sortDirection: saved.sortDirection === 'desc' ? 'desc' : 'asc',
    status: STATUS_FILTERS.some(({ value }) => value === saved.status) ? saved.status as StatusFilter : DEFAULT_LIST_SETTINGS.status,
    category: text('category'),
    tag: text('tag'),
    tracker: text('tracker'),
    view: saved.view === 'table' || saved.view === 'cards' ? saved.view : 'auto',
    pageSize: PAGE_SIZES.includes(saved.pageSize as typeof PAGE_SIZES[number]) ? saved.pageSize as number : DEFAULT_LIST_SETTINGS.pageSize,
  }
}

export function loadListSettings(): ListSettings {
  try {
    return parseListSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_LIST_SETTINGS
  }
}

export function saveListSettings(settings: ListSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing can block storage. The list still works, it just won't be remembered.
  }
}
