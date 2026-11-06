import { useState, type ReactNode } from 'react'
import { Bell, Magnet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { magnetHandlerUrl } from '@/lib/incoming'
import { finishNoticesOn, notificationsSupported, setFinishNotices } from '@/lib/notify'
import { t } from '@/i18n'

// Browsers only let secure pages handle magnet links, and Safari doesn't let pages do it at all.
const canHandleMagnets = () => window.isSecureContext && typeof navigator.registerProtocolHandler === 'function'

function Row({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

// Choices that belong to this browser rather than to qBittorrent.
export function BrowserSettings() {
  const [notices, setNotices] = useState(finishNoticesOn)

  const toggleNotices = async () => {
    const on = await setFinishNotices(!notices)
    setNotices(on)
    if (on && notificationsSupported() && Notification.permission === 'denied') {
      toast.info(t('Shown on this page only'), { description: t('The browser blocks notifications for this site, so finished downloads show here while the page is open.') })
    }
  }

  const registerMagnets = () => {
    try {
      navigator.registerProtocolHandler('magnet', magnetHandlerUrl(window.location))
      toast.success(t('Asked the browser'), { description: t('Confirm in the browser if it asks. Magnet links then open the Add page here.') })
    } catch (e) {
      toast.error(t('The browser didn\'t allow it'), { description: e instanceof Error ? e.message : undefined })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('This browser')}</CardTitle>
        <CardDescription>{t('Remembered on this device only')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Row icon={<Bell className="h-4 w-4" />} title={t('Finished downloads')} description={t('Say when a torrent finishes while this page is open. In the background this is a notification, if the browser allows it.')}>
          <Button variant={notices ? 'secondary' : 'outline'} size="sm" aria-pressed={notices} onClick={toggleNotices}>{notices ? t('On') : t('Off')}</Button>
        </Row>
        <Row
          icon={<Magnet className="h-4 w-4" />}
          title={t('Magnet links')}
          description={canHandleMagnets()
            ? t('Open magnet links from other sites on the Add page here.')
            : t('This browser can\'t open magnet links with a web page. It needs a secure (https) address, and Safari doesn\'t offer it.')}
        >
          <Button variant="outline" size="sm" disabled={!canHandleMagnets()} onClick={registerMagnets}>{t('Open them here')}</Button>
        </Row>
      </CardContent>
    </Card>
  )
}
