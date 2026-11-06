// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBackButtonClose } from './useBackButtonClose'

function View({ onClose }: { onClose: () => void }) {
  useBackButtonClose(onClose)
  return null
}

const nextTask = () => act(() => new Promise(resolve => setTimeout(resolve, 0)))

describe('useBackButtonClose', () => {
  it('closes on back, and takes its history entry away when closed another way', async () => {
    const onClose = vi.fn()
    const start = window.history.length
    const { unmount } = render(<View onClose={onClose} />)
    expect(window.history.length).toBe(start + 1)
    expect(window.history.state).toMatchObject({ qbminimalOverlay: true })

    // Going back lands on an unmarked entry.
    window.history.replaceState(null, '')
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(onClose).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('goes back one entry when closed by the app', async () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { unmount } = render(<View onClose={() => {}} />)
    unmount()
    await nextTask()
    expect(back).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })
})
