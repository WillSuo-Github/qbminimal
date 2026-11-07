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

// An iPhone Home Screen app with a see-through status bar is laid out shorter than the screen (see
// --standalone-gap in index.css). The shortfall is the screen's height less the layout's. Only an
// app filling the whole screen's width counts: an iPad window in Split View or Stage Manager is
// smaller than the screen on purpose.
if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
  const measureGap = () => {
    const landscape = window.innerWidth > window.innerHeight
    const [short, long] = [Math.min(screen.width, screen.height), Math.max(screen.width, screen.height)]
    const screenWidth = landscape ? long : short
    const screenHeight = landscape ? short : long
    const fullWidth = Math.abs(window.innerWidth - screenWidth) <= 1
    const gap = Math.round(screenHeight - document.documentElement.clientHeight)
    document.documentElement.style.setProperty('--standalone-gap', fullWidth && gap > 0 && gap < 120 ? `${gap}px` : '0px')
  }
  measureGap()
  window.addEventListener('resize', measureGap)
  window.addEventListener('orientationchange', () => setTimeout(measureGap, 300))
}

// Safari 17.4 and newer have a native iOS switch; elsewhere index.css draws one.
if ('switch' in HTMLInputElement.prototype) document.documentElement.classList.add('native-switch')

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
