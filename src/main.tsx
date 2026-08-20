// ============================================================
// Punto de entrada de la aplicación (el "arranque" del programa).
// Este archivo es el primero que se ejecuta cuando el navegador
// carga la página.
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Estilos globales (tema oscuro espacial, tipografía, etc.)
import App from './App' // Componente principal que contiene toda la interfaz
import { ErrorBoundary } from './components/ErrorBoundary'

// Busca el elemento <div id="root"> que hay en index.html y "monta"
// (pinta) dentro de él el componente <App />.
// StrictMode es un modo de desarrollo de React que ayuda a detectar
// errores; no afecta a lo que ve el usuario en producción.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
