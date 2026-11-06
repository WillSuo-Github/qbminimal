import { useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatVersion, isNewer, latestQbittorrent, latestQbminimal, parseVersion, QBITTORRENT_DOWNLOADS, QBMINIMAL_RELEASES } from '@/lib/updates'
import { t } from '@/i18n'

type Result = { latest: string; newer: boolean; link: string } | 'failed'

// Asks GitHub for the newest qbminimal and qBittorrent releases when the button is pressed.
export function UpdateCheck({ qbittorrentVersion }: { qbittorrentVersion: string | undefined }) {
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<[string, Result][] | null>(null)

  const check = async () => {
    setChecking(true)
    const compare = async (current: string | undefined, latest: () => Promise<ReturnType<typeof parseVersion>>, link: string): Promise<Result> => {
      try {
        const found = await latest()
        const installed = parseVersion(current)
        if (!found) return 'failed'
        return { latest: formatVersion(found), newer: !!installed && isNewer(found, installed), link }
      } catch {
        return 'failed'
      }
    }
    const [own, qbittorrent] = await Promise.all([
      compare(__APP_VERSION__, latestQbminimal, QBMINIMAL_RELEASES),
      compare(qbittorrentVersion, latestQbittorrent, QBITTORRENT_DOWNLOADS),
    ])
    setResults([['qbminimal', own], ['qBittorrent', qbittorrent]])
    setChecking(false)
  }

  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t('Asks GitHub for the latest releases.')}</p>
        <Button variant="outline" size="sm" disabled={checking} onClick={() => void check()}>
          <RefreshCw className={checking ? 'animate-spin' : undefined} />
          {checking ? t('Checking for updates...') : t('Check for updates')}
        </Button>
      </div>
      {results && (
        <dl className="space-y-1 text-sm" aria-live="polite">
          {results.map(([name, result]) => (
            <div key={name} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{name}</dt>
              <dd className="text-end">
                {result === 'failed' ? (
                  <span className="text-destructive">{t('Couldn\'t check for updates')}</span>
                ) : result.newer ? (
                  <a href={result.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2">
                    {t('Version {version} is available', { version: result.latest })}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                ) : (
                  <span className="text-green-600 dark:text-green-500">{t('Up to date')}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
