# CRISGER · Manual de marca interactivo

Landing de una sola página que presenta el sistema de identidad de **CRISGER · Seguridad Industrial**. Es un sitio estático (HTML, CSS y JavaScript) listo para GitHub Pages. No necesita backend ni claves de API.

## Estructura

```
index.html      Estructura base, visor de imágenes y editor
style.css       Diseño, tipografías locales y responsive
app.js          Render desde data.json, interacciones y editor
data.json       Todo el contenido editable del manual
fonts/          Bai Jamjuree (Regular, SemiBold, Bold) e Inter
vendor/         qrcode.js (Kazuhiko Arase, licencia MIT) para generar los códigos QR
media/          Logos en SVG (5 versiones × 3 fondos), PNG originales, maquetas, imagen para compartir y referencias
  descargas/    PNG en alta resolución, ZIP de logos, hoja membretada (Word y PDF) y manual en PDF
README.md
```

## Secciones

1. **Portada**: versión, título, texto introductorio, ubicación y enlace para explorar. El logo se muestra en la cabecera, sin repetirse en la portada.
2. **Esencia**: historia de CRISGER, maqueta de la fachada y los conceptos Proteger, Responder y Avanzar.
3. **Logo**: un único módulo con las versiones principal, vertical, compacta, logotipo e isotipo. Se puede alternar entre fondo claro, oscuro y naranja, ajustar la escala y descargar el archivo mostrado. También incluye un diagrama del espacio de protección y nueve usos incorrectos generados en CSS sobre el logo real.
4. **Colores**: paleta en mosaico con HEX, RGB y CMYK copiables, dos degradados de naranja a negro, explorador de tonos y matices (incluye el negro y su escala de grises) y comparador de contraste (claro, oscuro, naranja y degradado) con relación de contraste calculada.
5. **Tipografía**: el lettering del logo mediante su archivo original, Bai Jamjuree en Regular, SemiBold y Bold, Inter para párrafos y una jerarquía H1 · H2 · H3 · destacado · párrafo.
6. **Recursos**: carrusel con dos patrones construidos con el isotipo real (Trama técnica y Ritmo alternado). Se recorre deslizando, con flechas, con puntos o con el teclado.
7. **Aplicaciones**: una introducción sobre cómo se aplica la identidad en pantalla y en soportes físicos, y la galería de diez maquetas conceptuales, con filtro por categoría y visor ampliado (anterior/siguiente, contador, Escape, flechas del teclado y deslizamiento táctil).
8. **Voz e imagen**: tono de voz y fotografía en formato «Así sí / Así no», e iconografía con un set de 12 íconos de trazo. Cada ícono se copia en SVG con un toque y se puede ver sobre fondo claro, oscuro o naranja.
9. **Kit de marca**: descargas de los 15 logos (SVG y PNG en alta resolución), un ZIP con el paquete completo, la paleta en CSS o en texto para imprenta y las tipografías Bai Jamjuree e Inter. Incluye además:
   - **Generador de piezas**: seis formatos (publicación 1080 × 1080, historia 1080 × 1920, portada de LinkedIn 1584 × 396, enlace horizontal 1200 × 628 para Facebook y LinkedIn, fondo para videollamadas 1920 × 1080 y cartel A4 / A3 para imprimir), siete estructuras (**Clásica**, **Centrada**, **Panel**, **Franja**, **Destacado** para precios o cifras, **Ícono** con el set de íconos de la marca y **Marco**) y tres colores (negro, naranja o claro).
     - **Propósitos**: botones que cargan textos y estructura para un producto nuevo, una promoción, horarios y feriados, un consejo de seguridad, una búsqueda laboral o un cartel para imprimir. Los textos son un punto de partida para editar.
     - **Sello opcional** (por ejemplo «Nuevo» o «-15%») en un círculo en la esquina.
     - **Contacto y código QR**: franja opcional con teléfono, web y dirección, y un QR que abre WhatsApp, el sitio o cualquier enlace. Los datos quedan guardados en el navegador. En las historias, la franja deja libre la zona inferior que tapa Instagram. Conviene escanear el QR con el celular antes de imprimir.
     - **Carteles**: el formato A4 / A3 se descarga en PDF A4 o A3 (misma proporción, sin deformar) listo para imprimir. Son carteles informativos de marca: no reemplazan la señalización de seguridad normalizada (IRAM), que tiene colores y pictogramas propios. El fondo puede ser una imagen o un video propio, una maqueta del manual o un archivo de la carpeta de Google Drive; se encuadra arrastrándolo, con zoom y un velo que asegura la lectura. El logo y la trama se pueden mostrar u ocultar. Las imágenes se descargan en PNG y los videos se exportan como piezas animadas.
   - **Firma de correo**: se completan nombre, cargo, teléfono y correo, y se copia lista para pegar en Gmail u Outlook.
   - **Hoja membretada** en Word (para escribir) y en PDF (para imprimir).
   - **Manual en PDF** para enviar a imprentas o proveedores.
   - **Checklist para proveedores** completo, en un archivo de texto para adjuntar a un pedido.

## Herramientas de lectura

- **Crear pieza**: el botón naranja de la cabecera (y «Crear una pieza» en la portada) lleva directo al generador de piezas.

- **Buscador**: botón de la lupa en la cabecera, `Ctrl + K` (`⌘ K` en Mac) o la tecla `/`. Encuentra secciones, bloques, colores (copia el HEX), logos (descarga el archivo), aplicaciones y herramientas del kit. Se recorre con las flechas y se abre con Enter.
- **Modo oscuro**: sigue la configuración del dispositivo. El botón junto al buscador alterna entre automático, oscuro y claro, y el navegador lo recuerda. Los escenarios que muestran el logo o los colores sobre un fondo concreto conservan ese fondo. Al imprimir, el manual siempre sale claro.
- **Enlace a cada bloque**: el ícono de cadena junto a cada título copia la dirección directa a ese bloque (por ejemplo, `…/#bloque-proteccion`), ideal para mandarle a un proveedor la regla exacta.
- **Checklist para proveedores**: al final de las secciones Logo, Colores, Tipografía, Recursos, Aplicaciones y Voz hay una lista de puntos a verificar antes de producir. Se puede tildar en pantalla y copiar como texto. Se edita desde el editor, en la pestaña **Secciones** (una línea por punto; si queda vacía, el checklist no se muestra).

### Formatos de bloque nuevos en el editor

- **Así sí / Así no**: cada línea de la lista empieza con «Sí:» o «No:» para ubicarla en su columna. Si el bloque tiene imagen, se muestra junto al texto.
- **Set de íconos**: una línea por ícono. Disponibles: Casco, Guantes, Calzado, Chaleco, Protección ocular, Protección auditiva, Protección, Envío, Stock, Asesoramiento, Teléfono y Ubicación.


## Videos en el generador

- **Origen**: videos MP4, WebM o MOV de hasta **50 MB**.
- **Pieza exportada**: un tramo de **3 a 15 segundos**, elegido con los controles «Inicio del tramo» y «Duración de la pieza». Se exporta sin sonido, a 30 cuadros por segundo, con un peso orientativo de hasta 12 MB.
- **Formato**: Chrome y Edge actualizados, y Safari, exportan en **MP4 (H.264)**, el formato que aceptan Instagram, LinkedIn y WhatsApp. Otros navegadores exportan en **WebM**; en ese caso conviene convertirlo a MP4 antes de publicarlo.
- También se puede descargar el cuadro actual en PNG.
- La exportación se hace en tiempo real: un video de 10 segundos tarda unos 10 segundos. Conviene no cambiar de pestaña mientras se exporta.

## Carpeta de Google Drive

El generador puede mostrar como fondos las imágenes y los videos de una carpeta de Google Drive. Lo que se suba a esa carpeta aparece en el sitio al recargarlo, sin tocar GitHub.

**1. Preparar la carpeta**

1. En Google Drive, creá una carpeta (por ejemplo, «Crisger · Fondos para plantillas»).
2. Tocá **Compartir → Acceso general → Cualquier persona con el enlace → Lector**. Todo lo que pongas en esa carpeta será visible para quien tenga el enlace: no guardes ahí nada privado.
3. Copiá el enlace de la carpeta.

**2. Crear la clave de Google (una sola vez, unos 10 minutos)**

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com) con la misma cuenta de Google y creá un proyecto (por ejemplo, «Crisger manual»).
2. En **APIs y servicios → Biblioteca**, buscá **Google Drive API** y tocá **Habilitar**.
3. En **APIs y servicios → Credenciales → Crear credenciales → Clave de API**, copiá la clave generada.
4. Tocá la clave para restringirla:
   - En **Restricciones de aplicaciones**, elegí **Sitios web** y agregá la dirección del sitio con un asterisco al final, por ejemplo `https://USUARIO.github.io/*`. Si usás dominio propio, agregá también `https://manual.crisger.com.ar/*`.
   - En **Restricciones de API**, elegí **Restringir clave** y marcá solo **Google Drive API**.
   - Guardá.

Con estas restricciones, la clave solo funciona desde tu sitio y solo para leer archivos públicos de Drive, por eso puede quedar en `data.json`.

**3. Conectar el sitio**

1. Abrí el sitio con `?editar`, tocá **Editar contenido** y entrá en la pestaña **Portada**.
2. En el grupo **Google Drive**, pegá el enlace de la carpeta y la clave.
3. Exportá `data.json` y reemplazalo en GitHub para que quede publicado.

Las fotos de celular en formato HEIC no se pueden leer en el navegador: subilas en JPG o PNG. Los videos de Drive también respetan el límite de 50 MB.

## Vista previa al compartir

Al compartir el enlace por WhatsApp, LinkedIn o correo aparece una tarjeta con la imagen `media/og-crisger.jpg`, el título y la descripción del manual. Algunas aplicaciones solo muestran la imagen si la dirección es completa: en `index.html`, reemplazá `media/og-crisger.jpg` (dos veces) por la dirección publicada, por ejemplo `https://USUARIO.github.io/REPOSITORIO/media/og-crisger.jpg`. WhatsApp puede tardar en actualizar una vista previa que ya había guardado.

## Manual en PDF

`media/descargas/crisger-manual-de-marca.pdf` es una versión estática del manual en A4 horizontal. Si modificás el contenido, generá una nueva: abrí el sitio en Chrome, elegí **Imprimir → Guardar como PDF**, con márgenes **Ninguno** y **Gráficos de fondo** activado. El diseño se adapta solo para imprimir y oculta los controles interactivos. Después reemplazá el archivo en `media/descargas`.

## Modo presentación

El botón **Presentar** de la cabecera pone el manual en pantalla completa y lo recorre bloque por bloque, ideal para mostrarlo en una reunión:

- **Avanzar**: flecha derecha, flecha abajo, barra espaciadora o Av Pág. En pantallas táctiles, deslizá hacia la izquierda.
- **Retroceder**: flecha izquierda, flecha arriba o Re Pág. En pantallas táctiles, deslizá hacia la derecha.
- **Ir al principio o al final**: Inicio y Fin.
- **Salir**: Esc o el botón **Salir** de la barra inferior.

La barra inferior muestra la sección actual y el avance (por ejemplo, «Colores · 12 / 28»).

## Animaciones

Las animaciones acompañan la lectura sin distraer y usan solo recursos de la marca:

- **Portada**: el título entra palabra por palabra y el resplandor naranja del fondo aparece suavemente.
- **Titulares**: cada título de sección se revela palabra por palabra y la línea naranja del número crece al entrar en pantalla.
- **Entradas escalonadas**: los colores, conceptos, pesos tipográficos, niveles de jerarquía, usos incorrectos y maquetas de la galería aparecen en secuencia.
- **Usos incorrectos**: cada ejemplo aparece primero correcto y luego se deforma para mostrar el error. Al pasar el cursor, tocarlo o activarlo con el teclado vuelve al logo correcto para comparar.
- **Patrones**: la trama técnica tiene una onda de brillo diagonal y el ritmo alternado se desplaza en filas opuestas. Solo se animan mientras están en pantalla.
- **Interacciones**: transiciones al cambiar la versión del logo, el fondo del contraste o el color base de los tonos, una confirmación «Copiado» sobre cada color, deslizamiento direccional en el visor e indicador de sección que se mueve en la navegación.
- **Volver al inicio**: el botón muestra un anillo con el progreso de lectura.

El isotipo nunca se rota ni se deforma en las animaciones decorativas, para no contradecir las reglas del propio manual. Si el sistema tiene activado «Reducir movimiento» (`prefers-reduced-motion`), todo el contenido se muestra directamente, sin animaciones ni parallax.

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

## Dominio propio (opcional)

Para publicar el manual en una dirección como `manual.crisger.com.ar`:

1. En el repositorio, abrí **Settings → Pages → Custom domain**, escribí `manual.crisger.com.ar` y guardá. GitHub crea un archivo `CNAME` en la raíz.
2. En el panel donde se administra el dominio (el proveedor de hosting o de DNS de `crisger.com.ar`), creá un registro **CNAME** con nombre `manual` y valor `USUARIO.github.io` (tu usuario de GitHub).
3. Esperá a que el DNS se propague: puede tardar desde minutos hasta 24 horas. Después, en **Settings → Pages**, activá **Enforce HTTPS**.
4. Actualizá la dirección de la imagen de vista previa en `index.html` con el dominio nuevo.

## Si no ves los cambios después de actualizar

1. **Esperá a que termine la publicación.** En el repositorio, abrí la pestaña **Actions**: el proceso «pages build and deployment» tiene que aparecer con tilde verde. Suele tardar entre 1 y 3 minutos.
2. **Revisá dónde quedaron los archivos.** `index.html`, `app.js`, `style.css` y `data.json` tienen que estar en la raíz del repositorio, no dentro de una carpeta (por ejemplo, `CRISGER-Manual-Interactivo-GitHub/index.html`). Subí también las carpetas `media` y `fonts` completas. No subas el ZIP sin descomprimir.
3. **Forzá la recarga del navegador.** Usá `Ctrl + Shift + R` en Windows o `Cmd + Shift + R` en Mac, o abrí el sitio en una ventana de incógnito.
4. **Revisá si hay cambios locales.** Si alguna vez usaste el editor en ese navegador, el sitio muestra un aviso abajo a la izquierda. Elegí **Ver versión publicada** o, desde el editor, **Restaurar versión publicada**.

`index.html` carga `style.css` y `app.js` con un número de versión (`?v=...`). Si modificás esos archivos a mano, cambiá ese número para que los navegadores descarguen la versión nueva.

## Editar el contenido

El botón **Editar contenido** está oculto para los visitantes. Para verlo, abrí el sitio agregando `?editar` al final de la dirección, por ejemplo `https://USUARIO.github.io/crisger-manual/?editar`. El botón aparece en el pie de página y queda recordado en ese navegador. Para ocultarlo de nuevo, abrí la dirección con `?editar=0`.

El editor abre un panel con cinco pestañas:

- **Portada**: etiqueta y versión del manual, textos del kit de marca, título, texto, ubicación, texto del enlace, nombre de marca, descriptor y texto de cierre.
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

- En los textos, el nombre se escribe «Crisger» (no en mayúsculas sostenidas) y se destaca automáticamente en negrita. Si en `data.json` aparece como «CRISGER», el sitio lo muestra igual como «Crisger».

- Colores: naranja `#FE5000`, negro `#000000`, grafito `#44464B`, gris `#CCCCCC`, blanco cálido `#F2F2F2` y blanco `#FFFFFF`.
- Bai Jamjuree en títulos, navegación y etiquetas: Bold para titulares principales y SemiBold para niveles secundarios. Inter se usa solo en párrafos.
- Los logos se muestran en SVG, vectorizados a partir de los PNG originales (que siguen en `media/`). Para producción de gran formato conviene usar el vectorial original del diseñador.
- El logotipo siempre se muestra con sus archivos de marca. Su lettering, basado en Microgramma Extended Bold, no se recompone con una fuente ni se redistribuye.
- Las diez aplicaciones son **maquetas conceptuales** creadas para ilustrar el sistema, con el logo aplicado sobre cada superficie (cartel, laterales, etiquetas, parches, tapas). No son fotografías de productos reales.

## Accesibilidad y funcionamiento

- Navegación con indicador de sección activa, barra desplazable en móvil y enlace para saltar al contenido.
- Barra de progreso de lectura, botón para volver al inicio, desplazamiento suave y animaciones de entrada.
- Con `prefers-reduced-motion`, las animaciones y el desplazamiento suave se desactivan.
- Visor y editor construidos con `<dialog>` nativo: mantienen el foco dentro, se cierran con Escape y devuelven el foco al control de origen.
- Todos los controles funcionan con teclado, tienen estado visible (`aria-pressed`, `aria-current`) y áreas táctiles de al menos 38–44 px.
- Diseño probado entre 320 px y 1440 px de ancho, sin desbordes horizontales.
