import { Download, FileText, Radio, Search, Settings, type LucideIcon } from 'lucide-react'
import { t } from '@/i18n'

export type PageId = 'torrents' | 'rss' | 'search' | 'logs' | 'settings'

export const PAGES: { id: PageId; label: string; icon: LucideIcon }[] = [
  { id: 'torrents', label: t('Torrents'), icon: Download },
  { id: 'rss', label: 'RSS', icon: Radio },
  { id: 'search', label: t('Search'), icon: Search },
  { id: 'logs', label: t('Logs'), icon: FileText },
  { id: 'settings', label: t('Settings'), icon: Settings },
]
