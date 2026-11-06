import type { Torrent } from '@/types'

// The parts of sync/maindata's server_state the app shows. qBittorrent may add more.
export interface ServerState {
  // 'connected', 'firewalled', or 'disconnected'.
  connection_status?: string
  dht_nodes?: number
  dl_info_speed?: number
  up_info_speed?: number
  dl_info_data?: number
  up_info_data?: number
  dl_rate_limit?: number
  up_rate_limit?: number
  free_space_on_disk?: number
  alltime_dl?: number
  alltime_ul?: number
  global_ratio?: string
  total_wasted_session?: number
  total_peer_connections?: number
  read_cache_hits?: string
  read_cache_overload?: string
  write_cache_overload?: string
  total_buffers_size?: number
  queued_io_jobs?: number
  average_time_queue?: number
  total_queued_size?: number
  queueing?: boolean
  use_alt_speed_limits?: boolean
  // The last public addresses qBittorrent learned, or '' when unknown.
  last_external_address_v4?: string
  last_external_address_v6?: string
  // Web API 2.16.2 and newer: true while the whole session is paused.
  session_state?: boolean
  [key: string]: unknown
}

export interface MainData {
  rid: number
  torrents: Record<string, Torrent>
  // Each tracker URL and the hashes of the torrents that use it.
  trackers: Record<string, string[]>
  serverState: ServerState
}

export interface MainDataUpdate {
  rid?: number
  full_update?: boolean
  torrents?: Record<string, Partial<Torrent>>
  torrents_removed?: string[]
  trackers?: Record<string, string[]>
  trackers_removed?: string[]
  server_state?: Partial<ServerState>
}

// qBittorrent sends everything once, then only the fields that changed since `rid`.
export function applyMainDataUpdate(previous: MainData | null, update: MainDataUpdate): MainData {
  const full = update.full_update || !previous
  const torrents: Record<string, Torrent> = full ? {} : { ...previous.torrents }

  for (const [hash, changes] of Object.entries(update.torrents ?? {})) {
    torrents[hash] = { ...(full ? {} : torrents[hash]), ...changes, hash } as Torrent
  }
  for (const hash of update.torrents_removed ?? []) delete torrents[hash]

  // A tracker's entry is sent whole whenever its torrent list changes.
  const trackers: Record<string, string[]> = full ? {} : { ...previous.trackers }
  for (const [url, hashes] of Object.entries(update.trackers ?? {})) trackers[url] = hashes
  for (const url of update.trackers_removed ?? []) delete trackers[url]

  return {
    rid: update.rid ?? previous?.rid ?? 0,
    torrents,
    trackers,
    serverState: { ...(full ? {} : previous.serverState), ...update.server_state },
  }
}

// The sum of the torrents' own speeds. qBittorrent measures its global speeds separately, at another
// moment and over another span, so they rarely match the list; this sum always does.
export function totalSpeeds(torrents: Record<string, Torrent>): { down: number; up: number } {
  let down = 0
  let up = 0
  for (const torrent of Object.values(torrents)) {
    down += Math.max(torrent.dlspeed ?? 0, 0)
    up += Math.max(torrent.upspeed ?? 0, 0)
  }
  return { down, up }
}
