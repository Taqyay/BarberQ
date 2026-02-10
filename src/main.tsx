import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './material-web' // Register Material Design 3 Web Components
import App from './App.tsx'
// import './services/UAT_Simulator' // Activate UAT Simulator Listener

console.log('Main.tsx: Mounting React App...');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
