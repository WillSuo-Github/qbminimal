import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('index.html needs a #root element')

// The theme follows the device until someone picks light or dark in Settings.
createRoot(root).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
