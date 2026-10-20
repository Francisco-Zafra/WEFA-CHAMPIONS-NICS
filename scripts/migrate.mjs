#!/usr/bin/env node
/**
 * Migra los jugadores de FTB2.0 (SQLite, exportados a scripts/seed/players.json) a Firestore.
 *
 *   WEFA_PASSWORD=... npm run migrate                    # proyecto real
 *   WEFA_PASSWORD=... npm run migrate -- --create-admin  # crea antes la cuenta admin
 *   WEFA_PASSWORD=... npm run migrate -- --emulator      # emuladores locales
 *
 * Es idempotente: cada jugador se guarda como players/legacy-<id>, así que repetirlo no duplica.
 */
import { readFile } from 'node:fs/promises'
import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { connectFirestoreEmulator, doc, getFirestore, serverTimestamp, writeBatch } from 'firebase/firestore'

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const config = await read('../src/lib/firebase-config.json')
const players = await read('./seed/players.json')

const args = new Set(process.argv.slice(2))
const username = process.env.WEFA_USER ?? 'admin'
const password = process.env.WEFA_PASSWORD
if (!password) {
  console.error('Falta WEFA_PASSWORD (contraseña de la cuenta admin).')
  process.exit(1)
}
const email = `${username}@wefa-nics.app`

const app = initializeApp(config)
const auth = getAuth(app)
const db = getFirestore(app)
if (args.has('--emulator')) {
  const env = process.env
  connectAuthEmulator(auth, `http://127.0.0.1:${env.VITE_EMU_AUTH_PORT ?? 9099}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', Number(env.VITE_EMU_FIRESTORE_PORT ?? 8080))
  console.log('→ Usando emuladores locales')
}

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (args.has('--create-admin')) {
  try {
    await createUserWithEmailAndPassword(auth, email, password)
    console.log(`✓ Cuenta creada: ${username}`)
  } catch (e) {
    if (e.code === 'auth/admin-restricted-operation')
      fail(
        `El registro está desactivado en Firebase. Crea la cuenta en la consola ` +
          `(Authentication → Usuarios → Añadir usuario: ${email}) y repite sin --create-admin.`,
      )
    if (e.code !== 'auth/email-already-in-use') throw e
    console.log(`· La cuenta ${username} ya existía`)
  }
}

try {
  await signInWithEmailAndPassword(auth, email, password)
} catch (e) {
  if (e.code === 'auth/invalid-credential') fail(`No existe la cuenta ${email} o la contraseña no coincide.`)
  throw e
}
console.log(`✓ Sesión iniciada como ${username}`)

const batch = writeBatch(db)
for (const p of players) {
  batch.set(
    doc(db, 'players', `legacy-${p.legacyId}`),
    {
      name: p.name,
      // Media manual inicial: la de sus atributos (en FTB2.0 eran todos iguales)
      rating: Math.round(Object.values(p.stats).reduce((a, b) => a + b, 0) / 6),
      stats: p.stats,
      active: p.active,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
await batch.commit()
console.log(`✓ ${players.length} jugadores migrados (${players.filter((p) => p.active).length} convocados)`)
process.exit(0)
