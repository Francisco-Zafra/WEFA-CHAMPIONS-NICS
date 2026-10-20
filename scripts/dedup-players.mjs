#!/usr/bin/env node
/**
 * Detecta y limpia jugadores duplicados en Firestore preservando su avatar e historial de partidos.
 *
 *   WEFA_PASSWORD=... node scripts/dedup-players.mjs
 *   WEFA_PASSWORD=... node scripts/dedup-players.mjs --emulator
 */
import { readFile } from 'node:fs/promises'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  updateDoc,
} from 'firebase/firestore'

const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
const config = await read('../src/lib/firebase-config.json')

const args = new Set(process.argv.slice(2))
const username = process.env.WEFA_USER ?? 'admin'
const password = process.env.WEFA_PASSWORD
if (!password) {
  console.error('Falta WEFA_PASSWORD (contraseña de la cuenta admin).')
  console.error('Uso: WEFA_PASSWORD=... node scripts/dedup-players.mjs')
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

try {
  await signInWithEmailAndPassword(auth, email, password)
  console.log(`✓ Sesión iniciada como ${username}`)
} catch (e) {
  console.error(`✗ Error al iniciar sesión: ${e.message}`)
  process.exit(1)
}

// 1. Obtener partidos para saber qué IDs de jugador tienen historial
console.log('· Analizando historial de partidos...')
const matchesSnap = await getDocs(collection(db, 'matches'))
const matchPlayerIds = new Set()
for (const d of matchesSnap.docs) {
  const m = d.data()
  for (const p of m.teamA ?? []) if (p.id) matchPlayerIds.add(p.id)
  for (const p of m.teamB ?? []) if (p.id) matchPlayerIds.add(p.id)
  if (m.captainA) matchPlayerIds.add(m.captainA)
  if (m.captainB) matchPlayerIds.add(m.captainB)
  if (m.mvp) matchPlayerIds.add(m.mvp)
  if (m.goals?.byPlayer) {
    for (const pid of Object.keys(m.goals.byPlayer)) matchPlayerIds.add(pid)
  }
}

// 2. Obtener todos los jugadores
const playersSnap = await getDocs(collection(db, 'players'))
const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
console.log(`· Total de jugadores en base de datos: ${players.length}`)

// 3. Agrupar por nombre normalizado (ignorando mayúsculas y espacios sobrantes)
const byName = new Map()
for (const p of players) {
  const key = (p.name ?? '').trim().toLowerCase()
  if (!key) continue
  if (!byName.has(key)) byName.set(key, [])
  byName.get(key).push(p)
}

let duplicatesFound = 0

for (const [, group] of byName.entries()) {
  if (group.length <= 1) continue
  duplicatesFound++
  console.log(`\n⚠ Duplicados encontrados para "${group[0].name}":`)
  for (const p of group) {
    console.log(
      `   - ID: ${p.id.padEnd(24)} | Avatar: ${(p.avatar ?? 'ninguno').padEnd(16)} | Partidos: ${
        matchPlayerIds.has(p.id) ? 'SÍ' : 'no'
      } | Convocado: ${p.active ? 'SÍ' : 'no'}`,
    )
  }

  // Criterio para elegir el jugador principal a conservar:
  // 1. El que tenga partidos en el historial (para no romper estadísticas)
  // 2. El que tenga avatar asignado
  // 3. El que tenga ID legacy-* (migrado)
  group.sort((a, b) => {
    const aMatches = matchPlayerIds.has(a.id) ? 1 : 0
    const bMatches = matchPlayerIds.has(b.id) ? 1 : 0
    if (aMatches !== bMatches) return bMatches - aMatches

    const aAvatar = a.avatar ? 1 : 0
    const bAvatar = b.avatar ? 1 : 0
    if (aAvatar !== bAvatar) return bAvatar - aAvatar

    const aLegacy = a.id.startsWith('legacy-') ? 1 : 0
    const bLegacy = b.id.startsWith('legacy-') ? 1 : 0
    return bLegacy - aLegacy
  })

  const primary = group[0]
  const toDelete = group.slice(1)

  // Si el principal no tiene avatar pero alguno de los duplicados sí, transferirlo al principal
  if (!primary.avatar) {
    const withAvatar = toDelete.find((p) => !!p.avatar)
    if (withAvatar) {
      console.log(`   → Transfiriendo avatar "${withAvatar.avatar}" a ${primary.id}`)
      await updateDoc(doc(db, 'players', primary.id), { avatar: withAvatar.avatar })
      primary.avatar = withAvatar.avatar
    }
  }

  // Borrar los duplicados innecesarios
  for (const dup of toDelete) {
    console.log(`   ✗ Eliminando duplicado ${dup.id}`)
    await deleteDoc(doc(db, 'players', dup.id))
  }
}

if (duplicatesFound === 0) {
  console.log('\n✓ No se encontraron jugadores con nombres duplicados.')
} else {
  console.log(`\n✓ Limpieza completada: se resolvieron ${duplicatesFound} grupos duplicados.`)
}
process.exit(0)
