<img width="1024" height="1315" alt="WEFA Champions NICS" src="https://github.com/user-attachments/assets/fed1b162-d34f-4efc-a97f-40e2de18bb63" />

# ⚽🔥 WEFA CHAMPIONS NICS 🔥⚽

Bienvenidos al campo base oficial de la competición más esperada:
aquí no se programa, aquí se forjan equipos.

> _«No elegimos a los equipos… los equipos nos eligen a nosotros.»_

**👉 [Entrar al estadio](https://francisco-zafra.github.io/WEFA-CHAMPIONS-NICS/)**

---

## 🏆 Qué hay en el estadio

|                       |                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🃏 **Plantilla**      | Cartas estilo FUT (Icono, Oro, Plata y Bronce) con las 6 stats de cada jugador. Fichajes, bajas y convocatoria con un toque.                                                    |
| 🎲 **Sorteo**         | Elige convocados, clubes y capitanes, y añade reglas del tipo «estos dos nunca juntos» o «estos dos siempre juntos». El algoritmo iguala la media **y** cada stat por separado. |
| 🎬 **Ceremonia**      | Las cartas se revelan una a una con el himno de cada club.                                                                                                                      |
| 📋 **Pizarra**        | Campo con la formación calculada a partir de las stats, radar comparativo e **imagen 1080×1350 lista para WhatsApp**.                                                           |
| 📈 **Historial**      | Resultados, MVP, clasificación de los 8 clubes y ranking de jugadores con racha.                                                                                                |
| 📱 **App instalable** | Se puede añadir a la pantalla de inicio del móvil y funciona sin conexión.                                                                                                      |

### Los 8 clubes

🐝 Avispas F.C. · 🐗 C.D. Jabalíes · 🐧 Pingüinardos · 🪲 Beetles · 🦈 TiburOnes F.C. · 🐼 Pandas F.C. · 🦩 Real Flamingo · 🦆 Patos C.F.

## 🔐 Acceso

Cualquiera puede ver la plantilla, sortear equipos y consultar el historial. Para **editar** (fichar jugadores, guardar partidos y poner resultados) hay que entrar con el botón **Entrar** usando el usuario `admin`. La contraseña la tiene el míster.

---

## 🛠️ Para desarrolladores

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS 4 + Motion · Firebase (Firestore + Auth) · GitHub Pages.

```bash
npm install
npm run dev            # contra el Firebase real
```

### Desarrollo local con emuladores (sin tocar producción)

Requiere Java 21 o superior.

```bash
npm run emulators                                          # terminal 1
WEFA_PASSWORD=loquesea npm run migrate -- --emulator --create-admin   # carga los 27 jugadores
npm run dev:emulators                                      # terminal 2
```

### Scripts

| Comando                                 | Qué hace                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run test`                          | Tests de dominio (Vitest): reparto, formación y clasificaciones                                |
| `npm run lint` / `typecheck` / `format` | Calidad de código                                                                              |
| `npm run build`                         | Build de producción en `dist/`                                                                 |
| `npm run migrate`                       | Migra `scripts/seed/players.json` (exportado del SQLite de FTB2.0) a Firestore. Es idempotente |
| `npm run deploy:rules`                  | Publica `firestore.rules` (requiere `npx firebase-tools login`)                                |

### Estructura

```
src/
  domain/      Lógica pura y testeada: tipos, clubes, valoración, reparto, formación y clasificación
  lib/         Firebase, autenticación, acceso a datos y estado del sorteo
  components/  Componentes de UI (cartas, campo, radar, hojas, etc.)
  pages/       Plantilla, Sorteo (configuración, ceremonia y resultado) e Historial
public/clubs/  Escudos (WebP) e himnos (MP3) de los 8 clubes
scripts/       Migración y datos semilla
```

### Cómo funciona el reparto

`src/domain/balance.ts` minimiza `|Δ media| + 0,15 × Δ media por stat`:

- Hasta 60.000 combinaciones posibles (unos 18 jugadores) **las prueba todas**.
- Con más jugadores hace una **búsqueda local con reinicios aleatorios** (250 reinicios con intercambios de jugadores). Con 27 jugadores tarda milisegundos; antes eran unos 20 millones de combinaciones.
- Capitanes, «juntos» y «separados» se validan antes de buscar (union-find con paridad), así que las reglas contradictorias se detectan al momento.
- Entre las 40 mejores combinaciones dentro de la tolerancia se elige una al azar con semilla, para que cada sorteo sea distinto pero reproducible.

### Despliegue

Cada push a `main` pasa el CI (formato, lint, tests y build) y publica en GitHub Pages (`.github/workflows/ci.yml`).
