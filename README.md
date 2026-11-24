# Clásico 11

Fútbol de clubes y selecciones para el navegador (celular y PC). Jugadores 3D con el esqueleto de *Universal Base Characters* y camisetas según el club elegido.

## Publicar en GitHub Pages
1. Creá un repositorio nuevo en GitHub (por ejemplo `clasico-11`).
2. Subí **el contenido** de esta carpeta (no la carpeta en sí): `index.html`, los `icon*.png`, `favicon-32.png`, `apple-touch-icon.png`, `manifest.webmanifest` y `.nojekyll`.
3. En el repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)` → Save**.
4. En 1–2 minutos queda en `https://TU-USUARIO.github.io/clasico-11/`.

## Notas
- Three.js se carga desde jsDelivr (versión fija 0.160.0), por eso necesita internet. Si no carga, el juego usa solos los jugadores 2D de siempre.
- Para probarlo en tu PC hay que abrirlo con un servidor local (los módulos no funcionan con doble clic): `python3 -m http.server` y entrar a `http://localhost:8000`.
- Equipos: 27 clubes + 17 selecciones. Para agregar uno, sumá una línea `club(...)` en `index.html` (nombre, sigla, color de camiseta, color secundario, patrón, mangas, short, medias, arquero, alternativa). Patrones: `solid`, `stripes`, `hoops`, `sash`, `band`, `halves`, `center`.
- Solo se usan colores y nombres; no hay escudos oficiales.

## Modo cine (nuevo)
`js/cinema.js` agrega la capa de película: intro con título y música de trailer, barras de cine, etalonaje de color y grano de película, cámara lenta y **repetición** de cada gol, zoom dramático en penales, subtítulos de comentarista y epílogo al final. Se puede apagar desde Pausa → «Modo cine». Tocá la pantalla para saltar la intro o la repetición.
