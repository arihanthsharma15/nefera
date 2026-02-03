import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { NeferaRoutes } from './nefera/app'
import { NeferaProvider } from './nefera/state'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NeferaProvider>
      <BrowserRouter>
        <NeferaRoutes />
      </BrowserRouter>
    </NeferaProvider>
  </StrictMode>,
)
