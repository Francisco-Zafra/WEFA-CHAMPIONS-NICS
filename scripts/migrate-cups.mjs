#!/usr/bin/env node
/**
 * Pasa las copas del formato antiguo (cruces dentro del documento de la copa) al nuevo: cada cruce
 * con algo apuntado se convierte en un partido de `matches` con `cup: { id, tie }`.
 *
 * Si un cruce sin equipos coincide con un amistoso (mismos clubes, misma fecha y mismo marcador),
 * es el mismo partido guardado dos veces: el amistoso pasa a ser el partido del cruce y conserva
 * sus equipos, su MVP y sus votos.
 *
 *   node scripts/migrate-cups.mjs                                   # solo enseña lo que haría
 *   WEFA_PASSWORD=... node scripts/migrate-cups.mjs --apply         # lo hace (proyecto real)
 *   WEFA_PASSWORD=... node scripts/migrate-cups.mjs --emulator --apply
 *
 * Es idempotente: una copa ya convertida no tiene cruces dentro y se salta.
 */
import { readFile } from 'node:fs/promises'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'

const config = JSON.parse(await readFile(new URL('../src/lib/firebase-config.json', import.meta.url), 'utf8'))
const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')

const app = initializeApp(config)
const auth = getAuth(app)
const db = getFirestore(app)
if (args.has('--emulator')) {
  const env = process.env
  connectAuthEmulator(auth, `http://127.0.0.1:${env.VITE_EMU_AUTH_PORT ?? 9099}`, { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', Number(env.VITE_EMU_FIRESTORE_PORT ?? 8080))
  console.log('→ Usando emuladores locales')
} else console.log('→ Proyecto REAL')

if (apply) {
  const password = process.env.WEFA_PASSWORD
  if (!password) {
    console.error('✗ Falta WEFA_PASSWORD (contraseña de la cuenta admin).')
    process.exit(1)
  }
  await signInWithEmailAndPassword(auth, `${process.env.WEFA_USER ?? 'admin'}@wefa-nics.app`, password)
  console.log('✓ Sesión iniciada')
}

const cups = (await getDocs(collection(db, 'cups'))).docs.map((d) => ({ id: d.id, ...d.data() }))
const matches = (await getDocs(collection(db, 'matches'))).docs.map((d) => ({ id: d.id, ...d.data() }))

const feeders = (i) => (i < 4 ? null : i < 6 ? [(i - 4) * 2, (i - 4) * 2 + 1] : [4, 5])
const label = (i) => (i < 4 ? `Cuartos ${i + 1}` : i < 6 ? `Semis ${i - 3}` : 'Final')
const team = (t) => (Array.isArray(t) ? t : [])
const hasContent = (t) => !!t.winner || team(t.teamA).length > 0 || team(t.teamB).length > 0 || !!t.date

const batch = writeBatch(db)
let writes = 0
for (const cup of cups) {
  if (!Array.isArray(cup.ties)) continue
  console.log(`\nCopa «${cup.name}» (${cup.id})`)
  const ties = cup.ties
  const participants = (i) => {
    const from = feeders(i)
    if (!from) return [cup.seeds[i * 2] ?? null, cup.seeds[i * 2 + 1] ?? null]
    return [ties[from[0]]?.winner ?? null, ties[from[1]]?.winner ?? null]
  }
  ties.forEach((t, i) => {
    if (!t || !hasContent(t)) return
    const [a, b] = participants(i)
    if (!a || !b) return console.log(`  · ${label(i)}: sin participantes, se descarta`)
    if (matches.some((m) => m.cup?.id === cup.id && m.cup?.tie === i))
      return console.log(`  · ${label(i)}: ya tiene partido`)
    const score = t.scoreA !== null && t.scoreA !== undefined ? `${t.scoreA}–${t.scoreB}` : 'sin resultado'

    // ¿El mismo partido guardado también como amistoso?
    const twins =
      team(t.teamA).length === 0 && t.date
        ? matches.filter(
            (m) =>
              !m.cup &&
              m.date === t.date &&
              ((m.clubA === a && m.clubB === b && m.scoreA === t.scoreA && m.scoreB === t.scoreB) ||
                (m.clubA === b && m.clubB === a && m.scoreA === t.scoreB && m.scoreB === t.scoreA)),
          )
        : []
    if (twins.length === 1) {
      const m = twins[0]
      const flipped = m.clubA !== a
      console.log(
        `  ✓ ${label(i)} ${a} ${score} ${b}: se junta con el amistoso ${m.id}` +
          `${flipped ? ' (dándole la vuelta)' : ''}, conserva equipos, MVP y votos`,
      )
      batch.update(doc(db, 'matches', m.id), {
        cup: { id: cup.id, tie: i },
        winner: t.winner ?? null,
        ...(flipped
          ? {
              clubA: a,
              clubB: b,
              teamA: m.teamB,
              teamB: m.teamA,
              captainA: m.captainB ?? null,
              captainB: m.captainA ?? null,
              scoreA: m.scoreB,
              scoreB: m.scoreA,
            }
          : {}),
      })
    } else {
      console.log(`  + ${label(i)} ${a} ${score} ${b}: nuevo partido de copa`)
      batch.set(doc(collection(db, 'matches')), {
        date: t.date ?? '',
        time: t.time ?? null,
        place: t.place ?? null,
        clubA: a,
        clubB: b,
        captainA: t.captainA ?? null,
        captainB: t.captainB ?? null,
        teamA: team(t.teamA),
        teamB: team(t.teamB),
        scoreA: t.scoreA ?? null,
        scoreB: t.scoreB ?? null,
        winner: t.winner ?? null,
        mvp: null,
        resultAt: null,
        votingClosed: false,
        cup: { id: cup.id, tie: i },
        createdAt: serverTimestamp(),
      })
    }
    writes++
  })
  batch.update(doc(db, 'cups', cup.id), { ties: deleteField() })
  writes++
}

if (writes === 0) console.log('\nNada que migrar.')
else if (!apply) console.log('\nNo se ha escrito nada. Repite con --apply para hacerlo.')
else {
  await batch.commit()
  console.log(`\n✓ Hecho (${writes} escrituras)`)
}
process.exit(0)
