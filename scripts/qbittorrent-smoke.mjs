#!/usr/bin/env node
// Checks qbminimal against a real qBittorrent: that qBittorrent serves the built app as its
// alternative Web UI, and that the Web API calls the app depends on answer with the fields it reads.
// Usage: node scripts/qbittorrent-smoke.mjs http://127.0.0.1:8080 [username] [password]
// Without a username, qBittorrent must let local requests in without signing in.

const [base = 'http://127.0.0.1:8080', username, password] = process.argv.slice(2)
const api = `${base}/api/v2`
let cookie = ''
let failures = 0

const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) failures++
}

async function request(path, { method = 'GET', form } = {}) {
  const response = await fetch(`${api}/${path}`, {
    method,
    headers: { ...(cookie && { Cookie: cookie }), Referer: base, ...(form && { 'Content-Type': 'application/x-www-form-urlencoded' }) },
    body: form ? new URLSearchParams(form).toString() : undefined,
  })
  const text = await response.text()
  let body = text
  try { body = JSON.parse(text) } catch { /* plain text */ }
  return { status: response.status, body, headers: response.headers }
}

const hasKeys = (object, keys) => keys.filter(key => !(object && key in object))
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// --- The app itself, as qBittorrent serves it ---
const page = await fetch(`${base}/`)
const html = await page.text()
check(page.status === 200 && html.includes('<div id="root">'), 'qBittorrent serves qbminimal\'s page')
const script = html.match(/src="\.?\/?(assets\/index-[^"]+\.js)"/)?.[1]
check(!!script, 'the page names its script')
if (script) {
  const asset = await fetch(`${base}/${script}`)
  check(asset.status === 200 && (asset.headers.get('content-type') ?? '').includes('javascript'), `qBittorrent serves ${script}`)
}

// --- Signing in ---
if (username) {
  const login = await request('auth/login', { method: 'POST', form: { username, password: password ?? '' } })
  cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]
  check(login.status === 204 || (login.status === 200 && String(login.body).trim() === 'Ok.'), 'signs in')
}

// --- What the app reads ---
const version = await request('app/version')
check(version.status === 200 && /^v?\d+\.\d+/.test(String(version.body)), `app/version: ${version.body}`)
const webApi = await request('app/webapiVersion')
check(webApi.status === 200 && /^\d+\.\d+/.test(String(webApi.body)), `app/webapiVersion: ${webApi.body}`)

const prefs = await request('app/preferences')
const missingPrefs = hasKeys(prefs.body, ['save_path', 'queueing_enabled', 'dl_limit', 'up_limit', 'alt_dl_limit', 'alt_up_limit', 'listen_port', 'locale'])
check(prefs.status === 200 && missingPrefs.length === 0, `app/preferences${missingPrefs.length ? ` lacks ${missingPrefs.join(', ')}` : ''}`)

// A magnet for a torrent that doesn't exist: it stays waiting for metadata, which is enough.
const hash = 'c0ffee00c0ffee00c0ffee00c0ffee00c0ffee00'
const added = await request('torrents/add', { method: 'POST', form: { urls: `magnet:?xt=urn:btih:${hash}&dn=qbminimal-ci`, paused: 'true', stopped: 'true' } })
check(added.status === 200 || added.status === 202, `torrents/add answered ${added.status}`)

let main
for (let attempt = 0; attempt < 10; attempt++) {
  main = await request('sync/maindata?rid=0')
  if (main.body?.torrents?.[hash]) break
  await sleep(500)
}
const torrent = main.body?.torrents?.[hash]
check(!!torrent, 'sync/maindata lists the added torrent')
const torrentFields = ['name', 'state', 'progress', 'size', 'dlspeed', 'upspeed', 'eta', 'ratio', 'priority', 'num_seeds', 'num_complete', 'num_leechs', 'num_incomplete', 'added_on', 'category', 'tags', 'save_path', 'dl_limit', 'up_limit']
const missingTorrent = hasKeys(torrent, torrentFields)
check(missingTorrent.length === 0, `torrent fields${missingTorrent.length ? `: missing ${missingTorrent.join(', ')}` : ''}`)
check(Number(webApi.body?.split?.('.')[0] ?? 0) < 2 || !torrent || 'popularity' in torrent, 'torrents have popularity')
const missingState = hasKeys(main.body?.server_state, ['dl_info_speed', 'up_info_speed', 'dl_rate_limit', 'up_rate_limit', 'connection_status', 'queueing', 'use_alt_speed_limits', 'free_space_on_disk'])
check(missingState.length === 0, `server_state${missingState.length ? ` lacks ${missingState.join(', ')}` : ''}`)

// The header's global limits.
await request('transfer/setDownloadLimit', { method: 'POST', form: { limit: String(512 * 1024) } })
await sleep(600)
const limited = await request('sync/maindata?rid=0')
check(limited.body?.server_state?.dl_rate_limit === 512 * 1024, `the global download limit takes (${limited.body?.server_state?.dl_rate_limit})`)
await request('transfer/setDownloadLimit', { method: 'POST', form: { limit: '0' } })

const peers = await request(`sync/torrentPeers?hash=${hash}&rid=0`)
check(peers.status === 200 && peers.body && 'peers' in peers.body, 'sync/torrentPeers answers with peers')
const trackers = await request(`torrents/trackers?hash=${hash}`)
check(trackers.status === 200 && Array.isArray(trackers.body), 'torrents/trackers answers with a list')
const properties = await request(`torrents/properties?hash=${hash}`)
check(properties.status === 200 && properties.body && 'save_path' in properties.body, 'torrents/properties answers')

await request('torrents/delete', { method: 'POST', form: { hashes: hash, deleteFiles: 'false' } })
await sleep(500)
const after = await request('torrents/info')
check(Array.isArray(after.body) && !after.body.some(item => item.hash === hash), 'torrents/delete removes it')

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
