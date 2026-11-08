import { lazy, useEffect, useState, type ComponentType } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { Layout } from '@/components/Layout'
import { LoginForm } from '@/components/LoginForm'
import { PageBoundary } from '@/components/PageBoundary'
import type { PageId } from '@/components/navigation'
import { TorrentsView } from '@/components/torrents/TorrentsView'
import { SessionProvider } from '@/components/SessionProvider'
import { useSession } from '@/hooks/useSession'
import { hasIncoming, onIncoming } from '@/lib/incoming'
import { t } from '@/i18n'

const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then(module => ({ default: module[name] })))

// The torrent list opens first, so it ships in the main script. The other pages load when opened.
const PAGE_VIEWS: Record<PageId, ComponentType> = {
  torrents: TorrentsView,
  rss: named(() => import('@/components/rss/RSSView'), 'RSSView'),
  search: named(() => import('@/components/search/SearchView'), 'SearchView'),
  logs: named(() => import('@/components/logs/LogsView'), 'LogsView'),
  settings: named(() => import('@/components/settings/SettingsView'), 'SettingsView'),
}

const AddTorrentDialog = lazy(() => import('@/components/torrents/AddTorrentView').then(module => ({ default: module.AddTorrentDialog })))

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5000, retry: 1 } } })

// Notifications drop down over the header, clear of a phone's notch.
const TOAST_OFFSET = { top: 'calc(env(safe-area-inset-top) + 0.125rem)' }

function Screens() {
  const { status } = useSession()
  const [page, setPage] = useState<PageId>('torrents')
  const [addOpen, setAddOpen] = useState(hasIncoming)
  // Browser magnet links and dropped files open the same card without changing pages.
  useEffect(() => onIncoming(() => setAddOpen(true)), [])

  if (status === 'checking') return <p className="grid min-h-dvh place-items-center text-muted-foreground">{t('Connecting...')}</p>
  if (status === 'signedOut') return <LoginForm />

  const View = PAGE_VIEWS[page]
  return (
    <Layout page={page} onNavigate={setPage}>
      {/* The key resets a page's error state when switching away from it. */}
      <PageBoundary key={page}>
        <View />
      </PageBoundary>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        {page === 'torrents' && (
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              aria-label={t('Add torrent')}
              title={t('Add torrent')}
              className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(max(var(--bottom-nav-height,0px),env(safe-area-inset-bottom))+var(--details-height,0px)+var(--table-scrollbar-space,0px)+1rem)] z-30 size-12 rounded-full shadow-lg"
            >
              <Plus className="size-6" />
            </Button>
          </DialogTrigger>
        )}
        {addOpen && (
          <PageBoundary>
            <AddTorrentDialog onClose={() => setAddOpen(false)} />
          </PageBoundary>
        )}
      </Dialog>
    </Layout>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
      <SessionProvider>
        <Screens />
      </SessionProvider>
    </QueryClientProvider>
  )
}
