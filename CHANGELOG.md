# Cambios

Versiones de WEFA Champions NICS. Cada versión tiene su etiqueta en git (`v3.1.0`, `v3.0.0`…).

## 3.1.0 · 2026-10-15

### Novedades

- **Variedad en el sorteo:** mira las últimas alineaciones y evita repetir siempre las mismas parejas.
- **Votación del MVP:** tras apuntar un resultado, la grada vota durante 72 h (o hasta que el admin la cierre). Un voto por persona, sin crear cuenta.
- **Fichas de jugador:** números, forma, mejores y peores compañeros, víctimas y bestias negras, gráfica de evolución y club talismán.
- **Duelos:** cara a cara entre clubes y entre dos jugadores (juntos y enfrentados).
- **Récords:** «¿Funciona el sorteo?» (igualdad real de los partidos) y récords de goleadas, rachas, MVP y parejas.
- **Calibrar medias** (admin): sugiere subir o bajar la media de quien rinde claramente distinto a lo esperado.
- **Editar copa** (admin): cambiar el nombre, los clubes y el orden de los cruces sin perder los resultados que siguen valiendo.
- **Camisetas:** icono rojo o azul junto a cada equipo en toda la app y en la imagen para compartir.

### Cambios

- Los cruces de copa cuentan en la clasificación, el ranking, los duelos y las fichas. En copa, el empate lo gana quien pasó.
- Inicio en escritorio: equilibrio, pizarra y acciones en una sola columna.

### Documentación

- Presentación de la app en [`docs/presentacion/`](docs/presentacion/).

## 3.0.0 · 2026-10-15

Primera versión en GitHub Pages + Firebase, que sustituye a FTB2.0 (Streamlit + SQLite).

- Plantilla en cartas, con media manual, avatares y convocatoria.
- Sorteo en 3 pasos con capitanes, reglas «juntos» y «separados», tolerancia y ceremonia de revelación.
- Pizarra con el campo rojo y azul, ajustes a mano e imagen para compartir.
- Inicio con el próximo partido y su cuenta atrás.
- Copa eliminatoria de 8 clubes.
- Historial con resultados, clasificación de clubes y ranking de jugadores.
- Acceso de admin y de espectador (solo lectura). App instalable.
