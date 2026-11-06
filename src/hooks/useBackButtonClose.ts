import { useEffect } from 'react'

const MARK = 'qbminimalOverlay'
let openViews = 0
// One check after views close, however many closed together.
let pendingCheck = 0

const onMarkedEntry = () => !!(window.history.state as Record<string, unknown> | null)?.[MARK]

// For full-screen views on phones: the back button or gesture closes the view instead of
// leaving the page. While one is open, a marked history entry stands for it.
export function useBackButtonClose(onClose: () => void) {
  useEffect(() => {
    openViews++
    if (!onMarkedEntry()) window.history.pushState({ [MARK]: true }, '')
    // Going back lands on the entry before, which has no mark.
    const onPop = () => {
      if (!onMarkedEntry()) onClose()
    }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      openViews--
      // Closed some other way: take the entry back off. Waiting a moment lets a view that is
      // mounted again straight away (as development does) keep it.
      window.clearTimeout(pendingCheck)
      pendingCheck = window.setTimeout(() => {
        if (openViews === 0 && onMarkedEntry()) window.history.back()
      })
    }
  }, [onClose])
}
