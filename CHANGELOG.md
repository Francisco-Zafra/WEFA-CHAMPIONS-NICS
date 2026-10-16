# Cambios

Versiones de WEFA Champions NICS. Cada versión tiene su etiqueta en git (`v3.1.0`, `v3.0.0`…).

## 3.3.0 · 2026-10-16

### Novedades

- **Estadísticas, pestaña nueva:** jugadores, goleadores, clubes, comparar, récords y «¿Funciona el sorteo?», separados del historial.
- **Filtros para todo:** competición (copa y ronda), fechas y temporadas (de septiembre a junio), jugadores (alguno, juntos o enfrentados), clubes, campo, resultado y mínimos de partidos. Se combinan, siguen en todas las secciones y, si no queda ningún partido, la app propone qué quitar.
- **Goleadores:** el admin apunta quién marcó cada gol (y los de propia puerta), con aviso si no cuadra con el marcador. Pichichi, máximo goleador por club, récords de goles y goles en la ficha del jugador.
- **Comparar** dos jugadores o dos clubes lado a lado, enfrentados y juntos.
- **Ficha del partido** nueva: alineación con los goles, goleadores, MVP y ajustes del admin.
- Las cifras llevan a sus partidos: tocar «5 victorias» abre esos partidos en el historial.

### Cambios

- **Historial** solo con los partidos, agrupados por mes y con el máximo goleador de cada uno; en escritorio, la ficha al lado.
- **Navegación:** seis iconos en el móvil (solo la pestaña activa enseña su nombre) y menú lateral en dos grupos. El sorteo, para el admin, va en la cabecera del móvil.
- **Menos cajas:** listas con una línea fina en vez de tarjetas y pestañas subrayadas.
- **Calibrar medias** pasa de Plantilla a Estadísticas › ¿Funciona el sorteo?

## 3.2.0 · 2026-10-16

### Novedades

- **MVP en la copa:** los partidos de copa también tienen MVP y votación de la grada.

### Arreglos

- **Un partido, un solo registro:** los partidos de copa se guardan como cualquier otro partido y se ven a la vez en la copa y en el historial. Da igual dónde apuntes el resultado: no se duplica y las victorias cuentan para los jugadores.
- Al guardar en la pizarra un partido entre dos clubes que tienen un cruce de copa pendiente, la app pregunta si es el de la copa para no duplicarlo como amistoso.

### Cambios

- En copa, el empate se decide en la tanda de penaltis: la app pregunta «¿quién gana la tanda de penaltis?» y lo indica en el cuadro y en el historial.

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
