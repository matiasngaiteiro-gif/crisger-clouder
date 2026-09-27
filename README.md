# CRISGER · Manual de marca interactivo

Landing de una sola página que presenta el sistema de identidad de **CRISGER · Seguridad Industrial**. Es un sitio estático (HTML, CSS y JavaScript) listo para GitHub Pages. No necesita backend ni claves de API.

## Estructura

```
index.html      Estructura base, visor de imágenes y editor
style.css       Diseño, tipografías locales y responsive
app.js          Render desde data.json, interacciones y editor
data.json       Todo el contenido editable del manual
fonts/          Bai Jamjuree (Regular, SemiBold, Bold) e Inter
media/          Logos en SVG (5 versiones × 3 fondos), PNG originales, maquetas y referencias
README.md
```

## Secciones

1. **Portada**: logo original, versión, título, texto introductorio, ubicación y enlace para explorar.
2. **Esencia**: historia de CRISGER, maqueta de la fachada y los conceptos Proteger, Responder y Avanzar.
3. **Logo**: un único módulo con las versiones principal, vertical, compacta, logotipo e isotipo. Se puede alternar entre fondo claro, oscuro y naranja, ajustar la escala y descargar el archivo mostrado. También incluye un diagrama del espacio de protección y nueve usos incorrectos generados en CSS sobre el logo real.
4. **Recursos**: carrusel con dos patrones construidos con el isotipo real (Trama técnica y Ritmo alternado). Se recorre deslizando, con flechas, con puntos o con el teclado.
5. **Colores**: paleta en mosaico con HEX, RGB y CMYK copiables, dos degradados de naranja a negro, explorador de tonos y matices y comparador de contraste (claro, oscuro, naranja y degradado) con relación de contraste calculada.
6. **Tipografía**: el lettering del logo mediante su archivo original, Bai Jamjuree en Regular, SemiBold y Bold, Inter para párrafos y una jerarquía H1 · H2 · H3 · destacado · párrafo.
7. **Aplicaciones**: galería de diez maquetas conceptuales, con filtro por categoría y visor ampliado (anterior/siguiente, contador, Escape, flechas del teclado y deslizamiento táctil).

Algunas maquetas también aparecen dentro de su sección: la fachada en Esencia, el vehículo en Logo, el packaging en Recursos, la señalización en Colores y el catálogo en Tipografía.

## Publicar en GitHub Pages

1. Creá un repositorio en GitHub (por ejemplo, `crisger-manual`).
2. Descomprimí el ZIP y subí **el contenido** de la carpeta a la raíz del repositorio. `index.html` debe quedar en la raíz, no dentro de otra carpeta:
   - En la web de GitHub: **Add file → Upload files**, arrastrá `index.html`, `style.css`, `app.js`, `data.json`, `README.md` y las carpetas `fonts` y `media`, y confirmá con **Commit changes**.
   - Por terminal:
     ```bash
     git init
     git add .
     git commit -m "Manual de marca CRISGER"
     git branch -M main
     git remote add origin https://github.com/USUARIO/crisger-manual.git
     git push -u origin main
     ```
3. En el repositorio, abrí **Settings → Pages**.
4. En **Build and deployment → Source**, elegí **Deploy from a branch**.
5. En **Branch**, seleccioná `main` y la carpeta `/ (root)`. Guardá con **Save**.
6. Esperá uno o dos minutos. La dirección publicada aparece arriba en esa misma pantalla (`https://USUARIO.github.io/crisger-manual/`).

Todas las rutas son relativas, así que el sitio funciona tanto en un subdirectorio de GitHub Pages como en un dominio propio.

### Revisión local

Los navegadores bloquean la lectura de `data.json` cuando se abre `index.html` con doble clic (`file://`). Para probarlo en tu computadora, ejecutá dentro de la carpeta:

```bash
python -m http.server 8000
```

y abrí `http://localhost:8000`.

## Editar el contenido

El botón **Editar contenido** está en el pie de página. Abre un panel con cinco pestañas:

- **Portada**: etiqueta y versión del manual, título, texto, ubicación, texto del enlace, nombre de marca, descriptor y texto de cierre.
- **Secciones**: nombre en la navegación, número y categoría, título, introducción, nota y color de fondo. Permite agregar, ordenar y eliminar secciones.
- **Bloques**: título, texto, listas, notas, formato, categoría de galería e imagen (por ruta o subiendo un archivo). Permite agregar, duplicar, ordenar y eliminar bloques.
- **Colores**: nombre, HEX, RGB y CMYK de cada color. Permite agregar, ordenar y eliminar colores. El primer color define el acento de la interfaz.
- **Logos**: archivo de cada versión para fondo claro, oscuro y naranja, con vista previa y opción para restaurarlo.

Algunas listas también controlan ejemplos interactivos:

| Bloque | Qué controla la lista |
| --- | --- |
| Usos incorrectos | Un ejemplo por línea. Reconoce: color, contorno, forma, volumen, sombra, reflejar, comprimir, expandir y rotar. |
| Patrones | El nombre de cada patrón del carrusel. |
| Contraste y jerarquía | Línea 1: etiqueta · 2: titular · 3: texto · 4: acento. |
| Jerarquía flexible | Una línea por nivel con el formato `Referencia — Texto de ejemplo`. |
| De dónde venimos | Los conceptos que aparecen debajo de la historia. |

### Cómo se guardan los cambios

- Los cambios se guardan automáticamente en el `localStorage` de **ese navegador**. Un visitante que edita solo modifica su propia copia local: el repositorio y el sitio publicado no cambian.
- Cuando hay cambios sin publicar, el botón del pie muestra la etiqueta **Cambios locales**.
- **Exportar data.json** descarga el contenido actual.
- **Importar JSON** carga un `data.json` guardado antes.
- **Restaurar versión publicada** borra los cambios locales y vuelve a leer el `data.json` del sitio.

### Publicar una actualización

1. Editá el contenido desde el panel.
2. Pulsá **Exportar data.json**.
3. En GitHub, abrí `data.json`, elegí **Upload files** (o el ícono del lápiz) y reemplazalo por el archivo exportado. Confirmá con **Commit changes**.
4. Cuando GitHub Pages termine de publicar, usá **Restaurar versión publicada** en tu navegador para descartar la copia local.

Las imágenes que se suben desde el editor quedan incrustadas en el JSON. Para imágenes definitivas es mejor subir el archivo a `media/` en el repositorio y escribir su ruta (por ejemplo, `media/nueva-maqueta.webp`) en el campo **Ruta del archivo**. Así `data.json` se mantiene liviano.

## Criterios de marca

- Colores: naranja `#FE5000`, negro `#000000`, grafito `#44464B`, gris `#CCCCCC`, blanco cálido `#F2F2F2` y blanco `#FFFFFF`.
- Bai Jamjuree en títulos, navegación y etiquetas: Bold para titulares principales y SemiBold para niveles secundarios. Inter se usa solo en párrafos.
- Los logos se muestran en SVG, vectorizados a partir de los PNG originales (que siguen en `media/`). Para producción de gran formato conviene usar el vectorial original del diseñador.
- El logotipo siempre se muestra con sus archivos de marca. Su lettering, basado en Microgramma Extended Bold, no se recompone con una fuente ni se redistribuye.
- Las diez aplicaciones son **maquetas conceptuales** creadas para ilustrar el sistema. No son fotografías de productos reales.

## Accesibilidad y funcionamiento

- Navegación con indicador de sección activa, barra desplazable en móvil y enlace para saltar al contenido.
- Barra de progreso de lectura, botón para volver al inicio, desplazamiento suave y animaciones de entrada.
- Con `prefers-reduced-motion`, las animaciones y el desplazamiento suave se desactivan.
- Visor y editor construidos con `<dialog>` nativo: mantienen el foco dentro, se cierran con Escape y devuelven el foco al control de origen.
- Todos los controles funcionan con teclado, tienen estado visible (`aria-pressed`, `aria-current`) y áreas táctiles de al menos 38–44 px.
- Diseño probado entre 320 px y 1440 px de ancho, sin desbordes horizontales.
