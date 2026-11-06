import { useSyncExternalStore } from 'react'
import { useAppVersion } from '@/hooks/useApi'
import { getUpdateState, newerThan, subscribeUpdates } from '@/lib/updateNotice'

// What the last update check found, and whether either app has a newer version than the one running.
export function useUpdateNotice() {
  const state = useSyncExternalStore(subscribeUpdates, getUpdateState)
  const { data: qbittorrentVersion } = useAppVersion()

  const qbminimalNewer = newerThan(state.latest?.qbminimal, __APP_VERSION__)
  const qbittorrentNewer = newerThan(state.latest?.qbittorrent, qbittorrentVersion)
  return { ...state, qbminimalNewer, qbittorrentNewer }
}
