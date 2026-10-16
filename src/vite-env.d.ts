/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EMULATORS?: string
  readonly VITE_EMU_AUTH_PORT?: string
  readonly VITE_EMU_FIRESTORE_PORT?: string
}
