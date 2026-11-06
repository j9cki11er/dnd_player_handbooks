import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { applyTextSize, getTextSize } from './utils/textSize'

applyTextSize(getTextSize())

const container = document.getElementById('root')
const startupScreen = container.querySelector('.startup-screen')

async function start() {
  if (startupScreen) {
    const elapsed = performance.now() - Number(startupScreen.dataset.startedAt)
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 3000 - elapsed)))
    try {
      localStorage.setItem('dnd-startup-seen', '1')
    } catch {
      // Opening the handbook does not require browser storage.
    }
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

start()
