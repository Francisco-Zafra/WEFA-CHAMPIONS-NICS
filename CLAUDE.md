# CLAUDE.md

Guía para trabajar en este repo. Léela entera antes de hacer cambios.

## Qué es

WEFA Champions NICS: app para el partido semanal de un grupo de amigos. Sortea equipos igualados, guarda partidos y copas, abre la votación del MVP y lleva estadísticas. Sustituye a FTB2.0 (Streamlit + SQLite).

- Web: https://francisco-zafra.github.io/WEFA-CHAMPIONS-NICS/ (GitHub Pages, se publica al fusionar en `main`).
- Datos: Firebase (Firestore + Auth), proyecto `wefa-champions-nics`.
- Usuarios: un admin (edita todo) y espectadores (solo leen y votan al MVP).

## Comandos

```bash
npm run dev              # Vite contra el Firebase REAL (producción)
npm run emulators        # emuladores de Auth (9099) y Firestore (8080); requiere Java 21+. Guardan los datos en .emulators-data/ al salir con Ctrl+C
npm run emulators:clean  # los mismos emuladores, vacíos y sin guardar nada (para tus pruebas)
npm run dev:emulators    # Vite contra los emuladores (.env.emulators)
WEFA_PASSWORD=loquesea npm run migrate -- --emulator --create-admin   # siembra los 27 jugadores y crea el admin del emulador con esa contraseña

npm run format           # Prettier (el CI falla si no está formateado)
npm run lint             # ESLint
npm run typecheck        # tsc -b
npm run test             # Vitest
npm run build            # tsc + Vite → dist/
npm run deploy:rules     # publica firestore.rules (pregunta antes; toca producción)
```

Antes de dar algo por terminado: `npm run format && npm run lint && npm run typecheck && npm run test && npm run build`.

## Reglas de trabajo

- **No escribas la contraseña real del admin en ningún fichero del repo** (es público). En los emuladores usa cualquiera.
- **Producción es intocable sin permiso.** No escribas en el Firestore real, no despliegues reglas, no hagas push ni abras PRs sin que el usuario lo pida. Para probar, usa siempre los emuladores.
- **El usuario suele tener su `npm run dev` en el puerto 5173: no lo pares nunca.** Para tus pruebas, levanta Vite con `npx vite --mode emulators --port 5174 --strictPort` y los emuladores con `npm run emulators:clean` (así no ensucias ni pisas los datos de prueba del usuario en `.emulators-data/`). Si el usuario ya tiene sus emuladores en marcha (puertos 8080/9099 ocupados), no los pares: pregúntale. Al acabar, para solo tus procesos (5174, 8080, 9099, 4400, 4500, 9150).
- **Comprueba en el navegador los cambios de interfaz** (Playwright desde el directorio temporal, no en el repo): móvil 390×844 y escritorio 1440×900, como admin y como espectador si aplica. Mira las capturas antes de decir que está bien.
- **Si una pantalla necesita un diseño nuevo**, pregunta. El diseño original viene de Claude Design (artifact `https://claude.ai/artifact/EDxSxPdAEn74YeWiofYwXw`); lo nuevo se hace con los estilos existentes salvo que el usuario diga otra cosa.
- **Scripts temporales** (sembrar datos, capturas…) en el directorio temporal. Si uno tiene que vivir en `scripts/` para resolver dependencias, bórralo al terminar.

## Idioma y textos

- Toda la interfaz, los comentarios, los commits y la documentación van en **español**.
- Puntuación tipográfica en los textos que se ven: comillas «», raya –, punto medio ·, tildes y ñ siempre.
- Tono cercano y futbolero, sin tecnicismos para el usuario final.

## Arquitectura

```
src/
  domain/      Lógica PURA (sin React ni Firebase), cada módulo con su .test.ts
  lib/         Firebase, auth, acceso a datos (data.ts) y contextos compartidos
  hooks/       Hooks de React
  components/  UI reutilizable
  pages/       Una página por pantalla; con piezas propias, en carpeta (cup/, draw/, history/)
public/        Escudos e himnos (clubs/), avatares (avatars/*.webp), iconos
scripts/       migrate.mjs + seed/players.json (datos de FTB2.0)
docs/          Presentación de la app (HTML + PDF)
```

- Toda lógica nueva que se pueda testear va en `src/domain/` con pruebas. Las páginas solo componen.
- Imports con el alias `@/` (→ `src/`).
- Los ficheros de componentes exportan **solo componentes** (regla react-refresh de ESLint). Constantes y funciones compartidas, a `domain/` o `lib/`.
- `App.tsx` monta los providers (`VotesContext`, `DrawHistoryContext`…) y las rutas (HashRouter, base `/WEFA-CHAMPIONS-NICS/` en build).

## Modelo de datos (Firestore)

| Colección | Contenido                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `players` | `name`, `rating` (media manual 1–99), `stats` (6 atributos **decorativos**), `avatar` (id o null), `active` (convocado)                         |
| `matches` | Amistosos: clubes, equipos (instantánea con `rating` de cada jugador), capitanes, marcador, `mvp`, fecha/hora/campo, `resultAt`, `votingClosed` |
| `cups`    | `name`, `seeds` (8 clubes en orden del cuadro), `ties` (7 cruces: 0–3 cuartos, 4–5 semis, 6 final) con marcador, `winner`, equipos y fecha      |
| `votes`   | Votos del MVP. Id `${matchId}_${uid}`, solo creación                                                                                            |

Las reglas (`firestore.rules`): lectura pública; escribe solo `admin@wefa-nics.app` (el usuario «admin» de la app). Los votos los crea cualquier sesión anónima mientras la votación esté abierta. Si cambias el formato de un documento, revisa las reglas.

## Conceptos del dominio

- **Media (`rating`)**: la pone el admin a mano y es lo único que cuenta (reparto, categorías Oro ≥ 85 / Plata ≥ 75 / Bronce). Las `stats` solo se pintan en la carta y el radar.
- **Clubes**: 8 ids fijos (`domain/clubs.ts`). Sus colores deben coincidir con `.club-<id>` en `index.css`.
- **Rojo y azul**: el equipo A juega de **rojo** y va **arriba** en el campo; el B, de **azul** y abajo. En la UI se marca con `<Kit side="A|B" />` y en el campo con `.team-red` / `.team-blue`. Respétalo en cualquier pantalla nueva que enseñe dos equipos.
- **Color de marca fijo** `#9b7bff` (`--club` en `:root`); la interfaz no se tiñe con el club.
- **Reparto** (`domain/balance.ts`): minimiza `|Δ media| + 0,15·Δ stats + variedad·repetición`. Prueba todas las combinaciones hasta 60.000; si hay más, búsqueda local con reinicios. Elige al azar entre los 40 mejores dentro de la tolerancia. Capitanes y reglas «juntos»/«separados» se validan antes (union-find). La variedad (`domain/variety.ts`) mira las 6 últimas alineaciones, partidos y cruces, con decaimiento 0,7.
- **Estadísticas**: en `App.tsx`, `statsMatches` = amistosos (con MVP resuelto) + cruces de copa jugados (`cupMatches`). **Cualquier estadística nueva debe usar `statsMatches`** y sacar el resultado con `resultFor(m, side)`: en copa, un empate se decide en la tanda de penaltis y cuenta como victoria para quien la gana (`winner`).
- **MVP**: al guardar un resultado se pone `resultAt`. La votación dura 72 h (`domain/votes.ts`) o hasta que el admin la cierra. El MVP resuelto es el manual o, cerrada la votación, el más votado sin empate.
- **Copa** (`domain/cup.ts`): los cruces se guardan **solo en el documento de la copa**, nunca como `matches`. El historial los enseña con `cupMatches(cups, { pending: true })` y los abre en su ficha (`TieSheet`), así que el resultado se apunta en un único sitio. `setResult` borra lo que dependía de un ganador que cambia. `reseed` reordena el cuadro y lleva cada resultado con su enfrentamiento.
- **Calibrar medias** (`domain/insights.ts`): solo cuenta partidos jugados con la media actual del jugador. Sugiere cambios de ±1 a ±3 cuando la diferencia es clara (z ≥ 1,65) y hay al menos 5 partidos.

## Estilo y UI

- Tailwind 4. Las clases de diseño (`glass`, `panel`, `btn`, `pill`, `seg`, `select`, `field`, `banner`, `kpi`, `tbl`…) están en `src/index.css` dentro de `@layer components`; las utilidades de Tailwind las sobrescriben.
- Usa los tokens de `:root` (`--ink`, `--ink-2`, `--muted`, `--dim`, `--line`, `--club`, `--ok`, `--warn`…), no colores sueltos.
- Tipografías: Bebas Neue para titulares (`h-display`) y Geist para el texto.
- Iconos: `lucide-react`. Animaciones: `motion/react`, respetando `prefers-reduced-motion`.
- Pensado primero para móvil. Comprueba siempre los dos anchos y que no haya scroll horizontal.
- Avatares: `.webp` en `public/avatars/`, con su id en `domain/avatars.ts`. Los PNG originales están en `avatares/` (ignorado por git).

## Firebase: cosas a saber

- Para votar hace falta tener activados en la consola de Firebase el inicio de sesión **anónimo** y **«Habilitar creación (registro)»** (Authentication → Configuración → Acciones de usuario). Sin lo segundo, la votación falla con `ADMIN_ONLY_OPERATION`.
- Una sesión anónima no es una sesión de usuario: la pantalla de bienvenida la trata como «sin sesión».
- La configuración pública del cliente está en `src/lib/firebase-config.json` (no es secreta).

## Versiones, ramas y commits

- **Todo el trabajo se hace en la rama `dev`**; nunca se commitea directamente en `main`. Al cerrar una versión se abre un PR de `dev` a `main` y se fusiona con **Merge**, no con Squash, para que las etiquetas sigan en la historia de `main`. Después, `dev` se pone al día con `main` y se sigue trabajando en ella.
- **El `CHANGELOG.md` se actualiza sobre la marcha**, en el mismo commit que el cambio: cada novedad, cambio o arreglo que note el usuario final va a una sección `## Sin publicar` arriba del todo (con los apartados «Novedades», «Cambios», «Arreglos» o «Documentación» que hagan falta). Una línea por cambio, en el tono del resto del fichero; los cambios internos (refactors, tests, CI) no hace falta apuntarlos.
- **Las versiones se marcan con etiquetas de git `vX.Y.Z`** (versionado semántico). Cada versión publicada tiene su etiqueta anotada y no hay versión sin etiqueta. El número se decide mirando lo que ha entrado desde la última etiqueta (`git log $(git describe --tags --abbrev=0)..dev`):
  - **Z** (parche): solo arreglos o retoques, sin funciones nuevas.
  - **Y** (menor): funcionalidades nuevas o cambios visibles que no rompen nada.
  - **X** (mayor): algo de fondo (formato de datos incompatible, migración, rehacer la app…).
  - Al subir un número, los de su derecha vuelven a 0 (3.1.4 → 3.2.0).
- Al cerrar una versión, en `dev`: sube `version` en `package.json`, renombra `## Sin publicar` a `## X.Y.Z · AAAA-MM-DD` en el CHANGELOG (repasando que esté completa), haz el commit «Versión X.Y.Z: …» y créale la etiqueta con `git tag -a vX.Y.Z -m "Versión X.Y.Z"`. Luego el PR a `main`. La etiqueta se sube (`git push origin vX.Y.Z`) cuando el usuario pida el push.
- Mensajes de commit en español, con el formato «Área: qué cambia» (por ejemplo «Copa: botón «Editar copa» para…»), y un cuerpo breve si hace falta.
- Si cambian las funcionalidades clave, actualiza el README y, si procede, la presentación de `docs/presentacion/` (las capturas se hacen con datos de prueba en los emuladores).
