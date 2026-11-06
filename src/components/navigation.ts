import { Download, FileText, Radio, Search, Server, Settings, type LucideIcon } from 'lucide-react'

export type PageId = 'torrents' | 'add' | 'rss' | 'search' | 'logs' | 'settings'

export const PAGES: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'torrents', label: 'Torrents', icon: Download },
  { id: 'add', label: 'Add', icon: Server },
  { id: 'rss', label: 'RSS', icon: Radio },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'logs', label: 'Logs', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]
