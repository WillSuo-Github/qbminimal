import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { DropOverlay } from '@/components/DropOverlay'
import { GlobalSpeeds } from '@/components/GlobalSpeeds'
import { SpeedLimitToggle } from '@/components/SpeedLimitToggle'
import { PAGES, type PageId } from '@/components/navigation'
import { useSession } from '@/hooks/useSession'
import { readStored, writeStored } from '@/lib/storage'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

interface LayoutProps {
  page: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
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

// The phone tab bar's own height, as --nav-bar-height (index.css adds its gap above the home
// indicator to make --bottom-nav-height), and the header's, as --header-height. The page scrolls
// under both, with that much room at each end. Only the bars' own sizes are measured: Safari's
// window height changes with zooming and its toolbar, so it can't place them.
function useBarSizes() {
  const header = useRef<HTMLElement>(null)
  const nav = useRef<HTMLElement>(null)
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const root = document.documentElement.style
    const observer = new ResizeObserver(() => {
      if (nav.current?.offsetHeight) root.setProperty('--nav-bar-height', `${nav.current.offsetHeight}px`)
      if (header.current) root.setProperty('--header-height', `${header.current.offsetHeight}px`)
    })
    if (nav.current) observer.observe(nav.current)
    if (header.current) observer.observe(header.current)
    return () => {
      observer.disconnect()
      root.removeProperty('--nav-bar-height')
      root.removeProperty('--header-height')
    }
  }, [])
  return { header, nav }
}

const SIDEBAR_KEY = 'qbminimal.sidebar'

export function Layout({ page, onNavigate, children }: LayoutProps) {
  // Wide screens only: the sidebar can be hidden to give the list the whole width.
  const [sidebarShown, setSidebarShown] = useState(() => readStored(SIDEBAR_KEY) !== 'hidden')
  const toggleSidebar = () => {
    writeStored(SIDEBAR_KEY, sidebarShown ? 'hidden' : null)
    setSidebarShown(!sidebarShown)
  }
  const { header: headerRef, nav: navRef } = useBarSizes()

  // A newly opened page starts at its top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  const navButtons = PAGES.map(({ id, label, icon: Icon }) => (
    <Button key={id} variant={page === id ? 'secondary' : 'ghost'} className="justify-start gap-2" aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)}>
      <Icon className="h-5 w-5" />
      {label}
    </Button>
  ))

  return (
    // Below the md width (1200px) the window scrolls the page, under a glass header and a floating
    // glass tab bar, with room at the end so it can always come clear of the tab bar. Only a scrolling
    // window lets iPhone Safari show the page on behind its address bar; a fixed frame stops at it
    // and leaves a blank strip. Nothing may make the page wider than the screen: iPhone Safari would
    // then widen the whole layout, open it zoomed in, and push the tab bar out of sight.
    // --sidebar-width lets panels fixed to the window line up with the main column.
    <div style={{ '--sidebar-width': sidebarShown ? '12rem' : '0px' } as CSSProperties} className="min-h-screen bg-background max-md:overflow-x-clip">
      <header ref={headerRef} className="glass-bar sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex min-w-0 items-center gap-2">
            {/* The tab bar holds the pages on phones, so this corner only needs a way out. */}
            <LogoutButton iconOnly className="md:hidden" />
            <Button variant="ghost" size="icon" className="max-md:hidden" aria-label={sidebarShown ? t('Hide sidebar') : t('Show sidebar')} aria-pressed={!sidebarShown} title={sidebarShown ? t('Hide sidebar') : t('Show sidebar')} onClick={toggleSidebar}>
              {sidebarShown ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
            </Button>
            {/* Silkscreen's pixels are an eighth of its size, so it stays crisp at 16px or 24px, never 20px.
                24px fits phones from 375 points wide. */}
            <h1 className="brand-title text-base min-[375px]:text-2xl">{t('qBittorrent')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <GlobalSpeeds />
            {/* Last, so it stays put at the right edge whatever the speeds read. */}
            <SpeedLimitToggle />
          </div>
        </div>
        <ConnectionBanner />
      </header>

      <div>
        <div className="flex">
          {sidebarShown && (
            <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 flex-shrink-0 flex-col gap-1 self-start overflow-y-auto border-e p-2 pb-4 md:flex">
              <nav aria-label={t('Pages')} className="flex flex-col gap-1">{navButtons}</nav>
              <LogoutButton className="mt-auto" />
            </aside>
          )}
          <main className="min-w-0 flex-1 pt-4 pb-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] max-md:pb-[calc(var(--bottom-nav-height,5rem)+1rem)]">
            {children}
          </main>
        </div>
      </div>

      <DropOverlay />

      {/* Phones: a floating glass capsule, clear of the screen's edges and the home indicator. */}
      <nav
        ref={navRef}
        aria-label={t('Pages')}
        className="glass glass-flat fixed inset-x-[max(0.75rem,env(safe-area-inset-left))] bottom-[max(var(--nav-gap),env(safe-area-inset-bottom))] z-30 rounded-full md:hidden"
      >
        <div className="flex justify-around px-1 py-1.5">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => onNavigate(id)} className={cn('flex min-w-0 flex-1 flex-col items-center rounded-full px-1 py-1 transition-colors', page === id ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground')}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
