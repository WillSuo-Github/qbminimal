import { useTorrentAction } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import type { Torrent } from '@/types'
import { t } from '@/i18n'

// Actions that need a value first open a small dialog.
export type BulkPrompt = 'category' | 'addTags' | 'removeTags' | 'location' | 'limits' | 'shareLimits' | 'autoOn'

export interface MenuEntry {
  label: string
  onSelect: () => void
}

// Shown as sections of the More menu, and as sections or submenus of the right-click menu.
export interface MenuGroup {
  name: string
  entries: MenuEntry[]
}

// Everything that can be done to a set of torrents besides starting, stopping, and deleting them.
export function useBulkActions(torrents: Torrent[], ask: (prompt: BulkPrompt) => void): MenuGroup[] {
  const action = useTorrentAction()
  const hashes = torrents.map(t => t.hash)
  const one = torrents.length === 1

  const run = (label: string, work: (hashes: string[]) => Promise<unknown>, done: string, failed: string): MenuEntry => ({
    label,
    onSelect: () => void action.mutateAsync({ work: () => work(hashes), failed }).then(() => toast.success(done), () => undefined),
  })
  const prompt = (label: string, kind: BulkPrompt): MenuEntry => ({ label, onSelect: () => ask(kind) })
  const copy = (label: string, lines: string[], copiedMessage: string, failedMessage: string): MenuEntry => ({
    label,
    onSelect: () => void copyText(lines.join('\n')).then(copied => (copied ? toast.success(copiedMessage) : toast.error(failedMessage))),
  })
  const queue = t('Queue order changed')
  const queueFailed = t('Failed to change queue order')

  return [
    {
      name: 'Transfer',
      entries: [
        run(t('Force start'), h => qbitClient.setForceStart(h, true), t('Force start on'), t('Failed to change force start')),
        run(t('Stop forcing'), h => qbitClient.setForceStart(h, false), t('Force start off'), t('Failed to change force start')),
        run('Recheck', h => qbitClient.recheckTorrents(h), t('Recheck started'), t('Failed to start recheck')),
        run('Reannounce', h => qbitClient.reannounceTorrents(h), t('Reannounce sent'), t('Failed to reannounce')),
      ],
    },
    {
      name: 'Organize',
      entries: [
        prompt(t('Set category...'), 'category'),
        prompt(t('Add tags...'), 'addTags'),
        prompt(t('Remove tags...'), 'removeTags'),
        prompt(t('Move files...'), 'location'),
        prompt(t('Speed limits...'), 'limits'),
        prompt(t('Seeding limits...'), 'shareLimits'),
      ],
    },
    {
      name: 'Queue',
      entries: [
        run(t('Move to top'), h => qbitClient.moveInQueue(h, 'top'), queue, queueFailed),
        run(t('Move up'), h => qbitClient.moveInQueue(h, 'up'), queue, queueFailed),
        run(t('Move down'), h => qbitClient.moveInQueue(h, 'down'), queue, queueFailed),
        run(t('Move to bottom'), h => qbitClient.moveInQueue(h, 'bottom'), queue, queueFailed),
      ],
    },
    {
      name: 'Options',
      entries: [
        run(t('Switch sequential download'), h => qbitClient.toggleSequentialDownload(h), t('Sequential download switched'), t('Failed to change sequential download')),
        run(t('Switch first and last pieces first'), h => qbitClient.toggleFirstLastPiecePrio(h), t('Piece order switched'), t('Failed to change piece order')),
        run(t('Super seeding on'), h => qbitClient.setSuperSeeding(h, true), t('Super seeding on'), t('Failed to change super seeding')),
        run(t('Super seeding off'), h => qbitClient.setSuperSeeding(h, false), t('Super seeding off'), t('Failed to change super seeding')),
        prompt(t('Automatic management on...'), 'autoOn'),
        run(t('Automatic management off'), h => qbitClient.setAutoManagement(h, false), t('Automatic management off'), t('Failed to change automatic management')),
      ],
    },
    {
      name: 'Copy',
      entries: [
        copy(one ? t('Copy name') : t('Copy names'), torrents.map(torrent => torrent.name), one ? t('Name copied') : t('Names copied'), one ? t("Couldn't copy the name") : t("Couldn't copy the names")),
        copy(one ? t('Copy hash') : t('Copy hashes'), hashes, one ? t('Hash copied') : t('Hashes copied'), one ? t("Couldn't copy the hash") : t("Couldn't copy the hashes")),
        copy(one ? t('Copy magnet link') : t('Copy magnet links'), torrents.map(torrent => torrent.magnet_uri).filter(Boolean), one ? t('Magnet link copied') : t('Magnet links copied'), one ? t("Couldn't copy the magnet link") : t("Couldn't copy the magnet links")),
      ],
    },
  ]
}
