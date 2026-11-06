import { readStored, writeStored } from './storage'

// Whether to say when a torrent finishes while the page is open. Off until turned on in Settings.
const KEY = 'qbminimal.notifyFinished'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export const finishNoticesOn = () => readStored(KEY) === 'on'

// Turning them on asks the browser for permission to show notifications outside the page.
export async function setFinishNotices(on: boolean): Promise<boolean> {
  if (!on) {
    writeStored(KEY, null)
    return false
  }
  if (notificationsSupported() && Notification.permission === 'default') await Notification.requestPermission()
  writeStored(KEY, 'on')
  return true
}

// A system notification when the page is in the background and allowed to show one;
// otherwise the caller shows its own message on the page.
export function notifyInBackground(title: string, body: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted' || document.visibilityState === 'visible') return false
  try {
    new Notification(title, { body, icon: 'app-icon-192.png', tag: body })
    return true
  } catch {
    // Some phones only allow notifications from a service worker.
    return false
  }
}
