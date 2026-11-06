import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import { loadLanguage } from './i18n'
import { readMagnetFromAddress, sendToAdd } from './lib/incoming'
import './index.css'

// Opened by the browser for a magnet link: it goes to the Add page, and off the address.
const magnet = readMagnetFromAddress(window.location)
if (magnet) {
  sendToAdd({ links: [magnet] })
  window.history.replaceState(null, '', window.location.pathname)
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html needs a #root element')

// The language loads before the app's own modules, so all their text comes out translated.
// The theme follows the device until someone picks light or dark in Settings.
void loadLanguage()
  .then(() => import('./App'))
  .then(({ default: App }) => {
    createRoot(root).render(
      <StrictMode>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <App />
        </ThemeProvider>
      </StrictMode>,
    )
  })
