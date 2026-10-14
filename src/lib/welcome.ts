const KEY = 'wefa:welcomed'

/** ¿Ya pasó por la pantalla de bienvenida en este navegador? */
export function wasWelcomed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

export function markWelcomed() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* almacenamiento no disponible */
  }
}
