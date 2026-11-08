// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Torrent } from '@/types'

const torrent = (hash: string, name: string): Partial<Torrent> => ({
  hash, name, state: 'uploading', progress: 1, size: 1000, total_size: 1000, amount_left: 0, completed: 1000,
  dlspeed: 0, upspeed: 0, uploaded: 0, ratio: 1, eta: 8640000, num_seeds: 1, num_complete: 1, num_leechs: 0, num_incomplete: 0,
  category: '', tags: '', tracker: '', trackers_count: 0, magnet_uri: '', force_start: false, auto_tmm: false, priority: 0,
  added_on: 1, completion_on: 2, save_path: '/data',
})

const api = vi.hoisted(() => ({
  getMainData: async () => ({
    rid: 1,
    full_update: true,
    torrents: Object.fromEntries(['alpha', 'bravo', 'charlie', 'delta'].map((name, i) => [`h${i}`, torrent(`h${i}`, name)])),
    server_state: { dl_info_speed: 0, up_info_speed: 0 },
  }),
  getCategories: async () => ({}),
  getTags: async () => [],
  getWebApiVersion: async () => '2.11.3',
  deleteTorrents: vi.fn(async () => undefined),
  pauseTorrents: vi.fn(async () => undefined),
}))

// Anything else the page asks for answers with an empty list.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, qbitClient: new Proxy(api, { get: (target, key) => (key in target ? target[key as keyof typeof target] : async () => []) }) }
})

const { TorrentsView } = await import('./TorrentsView')

function renderView() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><TorrentsView /></QueryClientProvider>)
  return screen.findByText('alpha')
}

const row = (name: string) => within(screen.getByRole('table')).getByText(name).closest('tr') as HTMLElement
describe('the torrent list', () => {
  beforeEach(() => {
    api.deleteTorrents.mockClear()
    api.pauseTorrents.mockClear()
  })

  it('opens and closes details without entering selection mode', async () => {
    await renderView()
    const user = userEvent.setup()
    await user.click(row('bravo'))
    expect(screen.queryByRole('toolbar', { name: 'Selected torrents' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Select all' })).toBeNull()
    expect(await screen.findByRole('region', { name: 'Torrent details' }, { timeout: 5000 })).toHaveTextContent('bravo')
    await user.click(row('bravo'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Torrent details' })).toBeNull())
  })

  it('moves focus and follows with details using the arrow keys', async () => {
    await renderView()
    const user = userEvent.setup()
    await user.click(row('alpha'))
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(row('charlie')).toHaveFocus()
    expect(await screen.findByRole('region', { name: 'Torrent details' }, { timeout: 5000 })).toHaveTextContent('charlie')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Torrent details' })).toBeNull()
  })

  it('opens the torrent action menu on a touch hold', async () => {
    await renderView()
    const touch = { pointerType: 'touch', clientX: 10, clientY: 10 }
    const target = row('bravo')
    fireEvent.pointerDown(target, touch)
    await act(() => new Promise(resolve => setTimeout(resolve, 750)))
    fireEvent.pointerUp(target, touch)
    fireEvent.click(target)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('bravo')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Torrent details' })).toBeNull()
  })

  it('hides and restores columns from the header menus without changing sort', async () => {
    await renderView()
    const user = userEvent.setup()
    const name = screen.getByRole('columnheader', { name: 'Name' })
    await user.click(within(name).getByRole('button'))
    const order = name.getAttribute('aria-sort')
    fireEvent.contextMenu(screen.getByRole('columnheader', { name: 'Size' }))
    let menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: /^Size$/ }))
    expect(screen.queryByRole('columnheader', { name: 'Size' })).toBeNull()
    expect(name.getAttribute('aria-sort')).toBe(order)
    fireEvent.contextMenu(name)
    menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitemcheckbox', { name: /^Size$/ }))
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeTruthy()
  })

  it('deletes with files when ticked, and the lock remembers it for next time', async () => {
    await renderView()
    const user = userEvent.setup()
    await user.click(row('alpha'))
    await user.keyboard('{Delete}')
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Also delete the downloaded files' }))
    await user.click(within(dialog).getByRole('button', { name: 'Remember this choice' }))
    await user.click(within(dialog).getByRole('button', { name: 'Delete with files' }))
    expect(api.deleteTorrents).toHaveBeenCalledWith(['h0'], true)

    await user.click(row('bravo'))
    await user.keyboard('{Delete}')
    expect(await screen.findByRole('checkbox', { name: 'Also delete the downloaded files' })).toBeChecked()
  })

  it('acts only on the torrent that opened the right-click menu', async () => {
    await renderView()
    const user = userEvent.setup()
    await user.click(row('alpha'))
    fireEvent.contextMenu(row('charlie'))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByText('charlie')).toBeTruthy()
    await user.click(within(menu).getByRole('menuitem', { name: 'Stop' }))
    expect(api.pauseTorrents).toHaveBeenCalledWith(['h2'])
  })
})
