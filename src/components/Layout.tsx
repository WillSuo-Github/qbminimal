import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { DropOverlay } from '@/components/DropOverlay'
import { SpeedLimitToggle } from '@/components/SpeedLimitToggle'
import { PAGES, type PageId } from '@/components/navigation'
import { useTotalSpeeds } from '@/hooks/useApi'
import { useSession } from '@/hooks/useSession'
import { formatBytes } from '@/lib/format'
import { readStored, writeStored } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

interface LayoutProps {
  page: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

// Current speeds: stacked on phones, side by side on wider screens. Fixed-width digits keep
// them from jumping about as they change.
function Speeds() {
  const { data: speeds } = useTotalSpeeds()
  if (!speeds) return null
  const row = (arrow: string, color: string, speed = 0) => (
    <span className="flex items-center justify-end gap-1">
      <span className={color}>{arrow}</span>
      {formatBytes(speed)}/s
    </span>
  )
  return (
    <div className="flex flex-col items-end text-[10px] leading-tight tabular-nums whitespace-nowrap sm:flex-row sm:gap-2.5 sm:text-xs" aria-label={t('Current speeds')}>
      {row('↓', 'text-green-500', speeds.down)}
      {row('↑', 'text-blue-500', speeds.up)}
    </div>
  )
}

function LogoutButton({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  const { signOut } = useSession()
  const [busy, setBusy] = useState(false)
  const label = busy ? t('Logging out...') : t('Logout')
  const logOut = () => { setBusy(true); void signOut() }
  if (iconOnly) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled={busy} aria-label={label} title={label} onClick={logOut}>
        <LogOut className="size-5" />
      </Button>
    )
  }
  return (
    <Button variant="ghost" className={cn('justify-start gap-2 text-muted-foreground', className)} disabled={busy} onClick={logOut}>
      <LogOut className="h-5 w-5" />
      {label}
    </Button>
  )
}

// The phone's tab bar height (which includes the iPhone's home indicator area) is shared as
// --bottom-nav-height for the bars and panels fixed just above it.
function useBottomBarHeight() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const bar = ref.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement.style
    const observer = new ResizeObserver(() => root.setProperty('--bottom-nav-height', `${bar.offsetHeight}px`))
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.removeProperty('--bottom-nav-height')
    }
  }, [])
  return ref
}

const SIDEBAR_KEY = 'qbminimal.sidebar'

export function Layout({ page, onNavigate, children }: LayoutProps) {
  // Wide screens only: the sidebar can be hidden to give the list the whole width.
  const [sidebarShown, setSidebarShown] = useState(() => readStored(SIDEBAR_KEY) !== 'hidden')
  const toggleSidebar = () => {
    writeStored(SIDEBAR_KEY, sidebarShown ? 'hidden' : null)
    setSidebarShown(!sidebarShown)
  }
  const scroller = useRef<HTMLDivElement>(null)
  const bottomBar = useBottomBarHeight()

  // A newly opened page starts at its top.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [page])

  const navButtons = PAGES.map(({ id, label, icon: Icon }) => (
    <Button key={id} variant={page === id ? 'secondary' : 'ghost'} className="justify-start gap-2" aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
      <Icon className="h-5 w-5" />
      {label}
    </Button>
  ))

  return (
    // Below 1200px the header, the page and the tab bar stack in a box the size of the screen,
    // and only the page between them scrolls, so the tab bar can never cover its end. A
    // scrolling window would also make iPhone Safari collapse its toolbar, and the next tap near
    // the bottom would then reopen the toolbar instead of reaching the tab bar.
    // --sidebar-width lets panels fixed to the window line up with the main column.
    <div style={{ '--sidebar-width': sidebarShown ? '12rem' : '0px' } as CSSProperties} className="min-h-screen bg-background max-md:fixed max-md:inset-0 max-md:flex max-md:min-h-0 max-md:flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur max-md:shrink-0">
        <div className="flex h-14 items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2">
            {/* The tab bar holds the pages on phones, so this corner only needs a way out. */}
            <LogoutButton iconOnly className="md:hidden" />
            <Button variant="ghost" size="icon" className="max-md:hidden" aria-label={sidebarShown ? t('Hide sidebar') : t('Show sidebar')} aria-pressed={!sidebarShown} title={sidebarShown ? t('Hide sidebar') : t('Show sidebar')} onClick={toggleSidebar}>
              {sidebarShown ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
            </Button>
            <h1 className="brand-title text-xl sm:text-2xl">{t('qBittorrent')}</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Speeds />
            {/* Last, so it stays put at the right edge whatever the speeds read. */}
            <SpeedLimitToggle />
          </div>
        </div>
        <ConnectionBanner />
      </header>

      <div ref={scroller} className="max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:overscroll-x-none max-md:overscroll-y-contain">
        <div className="flex">
          {sidebarShown && (
            <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 flex-shrink-0 flex-col gap-1 self-start overflow-y-auto border-e p-2 pb-4 md:flex">
              <nav aria-label={t('Pages')} className="flex flex-col gap-1">{navButtons}</nav>
              <LogoutButton className="mt-auto" />
            </aside>
          )}
          <main className="min-w-0 flex-1 pt-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-4">
            {children}
          </main>
        </div>
      </div>

      <DropOverlay />

      <nav ref={bottomBar} aria-label={t('Pages')} className="z-30 shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:hidden">
        <div className="flex justify-around px-1 py-2">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1', page === id ? 'text-primary' : 'text-muted-foreground')}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
