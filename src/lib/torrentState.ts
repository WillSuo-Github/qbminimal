import { t } from '@/i18n'
// How a torrent's state reads and looks in the list.

// qBittorrent 5 says 'stopped' where 4.x said 'paused'.
export const isStoppedState = (state: string): boolean => /^(paused|stopped)/.test(state)

type Tone = 'blue' | 'green' | 'yellow' | 'red' | 'muted'

function stateTone(state: string, completedOn: number): Tone {
  if (isStoppedState(state) && completedOn > 0) return 'green'
  if (state === 'downloading' || state === 'forcedDL' || state === 'metaDL' || state === 'forcedMetaDL') return 'blue'
  if (state === 'uploading' || state === 'forcedUP' || state === 'checkingUP' || state === 'completed' || state === 'seeding') return 'green'
  if (isStoppedState(state)) return 'yellow'
  if (state === 'error' || state === 'missingFiles') return 'red'
  return 'muted'
}

const TEXT: Record<Tone, string> = {
  blue: 'text-blue-500',
  green: 'text-green-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  muted: 'text-muted-foreground',
}

const BADGE: Record<Tone, string> = {
  blue: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/15 text-green-700 dark:text-green-400',
  yellow: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  red: 'bg-red-500/15 text-red-600 dark:text-red-400',
  muted: 'bg-muted text-muted-foreground',
}

export const getStateColor = (state: string, completedOn: number): string => TEXT[stateTone(state, completedOn)]
export const getStateBadge = (state: string, completedOn: number): string => BADGE[stateTone(state, completedOn)]

const LABELS: Record<string, string> = {
  downloading: 'Downloading',
  pausedDL: 'Paused',
  pausedUP: 'Paused',
  stoppedDL: 'Stopped',
  stoppedUP: 'Stopped',
  uploading: 'Seeding',
  completed: 'Completed',
  seeding: 'Seeding',
  stalledDL: 'Stalled',
  stalledUP: 'Stalled',
  checkingUP: 'Checking',
  checkingDL: 'Checking',
  error: 'Error',
  forcedDL: 'Forced DL',
  forcedUP: 'Forced UP',
  forcedMetaDL: 'Meta DL',
  metaDL: 'Meta DL',
  allocating: 'Allocating',
  checkingResumeData: 'Checking',
  moving: 'Moving',
  missingFiles: 'Missing Files',
  queuedDL: 'Queued',
  queuedUP: 'Queued',
}

export function getStateLabel(state: string, completedOn: number): string {
  if (isStoppedState(state) && completedOn > 0) return t('Completed')
  return LABELS[state] ? t(LABELS[state]) : state
}

const NEVER = 8640000
const ETA_UNITS: [seconds: number, suffix: string][] = [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']]

// The largest whole unit only, like "3h", to keep table cells short. qBittorrent reports 100
// days (8640000 seconds) or more when a torrent won't finish, shown as ∞.
export function formatEta(seconds: number): string {
  if (!(seconds >= 0 && seconds < NEVER)) return '∞'
  const [size, suffix] = ETA_UNITS.find(([unit]) => seconds >= unit) ?? [1, 's']
  return `${Math.floor(seconds / size)}${suffix}`
}

// Red for a poor ratio, through yellow, to green and blue for a healthy one.
export function ratioColor(ratio: number): string {
  if (ratio < 0.5) return 'text-red-500'
  if (ratio < 1) return 'text-orange-500'
  if (ratio < 2) return 'text-yellow-600 dark:text-yellow-400'
  if (ratio < 5) return 'text-green-600 dark:text-green-400'
  return 'text-sky-600 dark:text-sky-400'
}
