import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
// La config web de Firebase es pública por diseño; la seguridad está en firestore.rules
import config from './firebase-config.json'

export const app = initializeApp(config)
export const auth = getAuth(app)
const useEmulators = import.meta.env.VITE_EMULATORS === 'true'

export const db = initializeFirestore(app, {
  // Caché offline en producción; en emuladores, en memoria para no mezclar datos
  localCache: useEmulators
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

/** El login es "usuario + contraseña"; Firebase Auth necesita un email */
export const ACCOUNT_DOMAIN = 'wefa-nics.app'
export const ADMIN_EMAIL = `admin@${ACCOUNT_DOMAIN}`

export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${ACCOUNT_DOMAIN}`
