import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App'
import { applyTheme, getStoredTheme } from '@/stores/theme'
import '@/styles/globals.css'

applyTheme(getStoredTheme())

// Register the service worker after the first paint so offline support never
// competes with rendering the app shell.
if ('serviceWorker' in navigator) {
  const register = () =>
    registerSW({
      immediate: false,
      onNeedRefresh() {
        // autoUpdate handles the refresh; this hook keeps room for a future toast.
      },
    })

  if (document.readyState === 'complete') {
    register()
  } else {
    window.addEventListener('load', register, { once: true })
  }
}

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element was not found')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
