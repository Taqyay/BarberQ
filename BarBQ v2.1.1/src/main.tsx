import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App.tsx'
// import './services/UAT_Simulator' // Activate UAT Simulator Listener

console.log('Main.tsx: Mounting React App...');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
