import '@fontsource/great-vibes'
import '@fontsource/monoton'
import '@fontsource/playfair-display/600.css'
import '@fontsource/bebas-neue'
import '@fontsource/outfit/600.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Sin StrictMode: en dev monta dos veces y libera la cámara dos veces,
// lo que en Windows suele provocar NotReadableError con la webcam.
createRoot(document.getElementById('root')!).render(<App />)
