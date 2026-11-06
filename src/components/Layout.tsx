import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SpeedLimitToggle } from '@/components/SpeedLimitToggle'
import { PAGES, type PageId } from '@/components/navigation'
import { useTransferInfo } from '@/hooks/useApi'
import { useSession } from '@/hooks/useSession'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

interface LayoutProps {
  page: PageId
  onNavigate: (page: PageId) => void
  children: ReactNode
}

// Current speeds. Fixed-width digits and a minimum width keep the turtle beside them still.
function Speeds() {
  const { data: state } = useTransferInfo()
  if (!state) return null
  const row = (arrow: string, color: string, speed = 0) => (
    <span className="flex min-w-[4.75rem] items-center justify-end gap-1 sm:min-w-[5.75rem]">
      <span className={color}>{arrow}</span>
      {formatBytes(speed)}/s
    </span>
  )
  return (
    <div className="flex flex-col items-end text-[10px] leading-tight tabular-nums whitespace-nowrap sm:flex-row sm:gap-3 sm:text-xs" aria-label="Current speeds">
      {row('↓', 'text-green-500', state.dl_info_speed)}
      {row('↑', 'text-blue-500', state.up_info_speed)}
    </div>
  )
}

function LogoutButton({ className }: { className?: string }) {
  const { signOut } = useSession()
  const [busy, setBusy] = useState(false)
  return (
    <Button variant="ghost" className={cn('justify-start gap-2 text-muted-foreground', className)} disabled={busy} onClick={() => { setBusy(true); void signOut() }}>
      <LogOut className="h-5 w-5" />
      {busy ? 'Logging out...' : 'Logout'}
    </Button>
  )
}

// The phone's tab bar covers the bottom of the page, so its real height (which includes the
// iPhone's home indicator area) is shared as --bottom-nav-height for padding and sticky bars.
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

export function Layout({ page, onNavigate, children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const bottomBar = useBottomBarHeight()

  // A newly opened page starts at its top.
  useEffect(() => {
    scroller.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [page])

  const go = (id: PageId) => {
    onNavigate(id)
    setMenuOpen(false)
  }

  const navButtons = PAGES.map(({ id, label, icon: Icon }) => (
    <Button key={id} variant={page === id ? 'secondary' : 'ghost'} className="justify-start gap-2" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
      <Icon className="h-5 w-5" />
      {label}
    </Button>
  ))

  return (
    // Below 1200px the page scrolls inside this box, not the window. A scrolling window makes
    // iPhone Safari collapse its toolbar, and the next tap near the bottom then reopens the
    // toolbar instead of reaching the tab bar.
    <div ref={scroller} className="min-h-screen bg-background max-md:fixed max-md:inset-0 max-md:overflow-y-auto max-md:overscroll-y-contain">
      <header className="sticky top-0 z-40 border-b bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="brand-title text-xl sm:text-2xl">qBittorrent</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Speeds />
            {/* Last, so it stays put at the right edge whatever the speeds read. */}
            <SpeedLimitToggle />
          </div>
        </div>
        {menuOpen && (
          <nav aria-label="Pages" className="flex flex-col border-t p-2 md:hidden">
            {navButtons}
            <div className="my-1 border-t" />
            <LogoutButton />
          </nav>
        )}
      </header>

      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-48 flex-col gap-1 self-start overflow-y-auto border-r p-2 pb-4 md:flex">
          <nav aria-label="Pages" className="flex flex-col gap-1">{navButtons}</nav>
          <LogoutButton className="mt-auto" />
        </aside>
        <main className="min-w-0 flex-1 pt-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(var(--bottom-nav-height,calc(4rem+env(safe-area-inset-bottom)))+1rem)] md:pb-4">
          {children}
        </main>
      </div>

      <nav ref={bottomBar} aria-label="Pages" className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] backdrop-blur md:hidden">
        <div className="flex justify-around px-1 py-2">
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-1', page === id ? 'text-primary' : 'text-muted-foreground')}>
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
