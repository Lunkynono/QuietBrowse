# Instalar QuietBrowse en Windows

Por ahora no hay instalación desde la tienda de Chrome. Estos son los pasos para preparar la extensión a partir del código:

1. Instala [Node.js](https://nodejs.org/) si aún no lo tienes. Usa la versión 22 o una posterior.
2. Descarga este proyecto y descomprímelo en una carpeta de tu elección.
3. Abre esa carpeta en el Explorador de archivos. Haz clic en la barra de dirección, escribe `powershell` y pulsa Intro.
4. En la ventana que se abre, ejecuta `npm.cmd ci`. Cuando termine, ejecuta `npm.cmd run build`. Es normal que aparezcan mensajes técnicos; lo importante es que el segundo comando termine con «QuietBrowse preparado».
5. Abre Chrome y escribe `chrome://extensions` en la barra de direcciones. Activa «Modo de desarrollador», pulsa «Cargar descomprimida» y elige la carpeta `dist` que se ha creado dentro del proyecto.
6. Si quieres, fija el icono de QuietBrowse junto a la barra de direcciones.

Abre una web y pulsa el icono para ver el estado, el contador y los controles. El botón «Ver ajustes» abre las opciones de apariencia, filtros y webs excluidas.

Si ya la tenías instalada y descargas una versión nueva, repite el paso 4 y pulsa «Actualizar» en `chrome://extensions`. Si cambias los filtros o haces una excepción, recarga las pestañas abiertas para aplicar el cambio.

Si una web se comporta mal, pulsa «Pausar aquí» y recárgala. Puedes volver a protegerla desde el mismo sitio. Si usas otro bloqueador, sus resultados pueden mezclarse con los de QuietBrowse; desactívalo temporalmente solo si quieres comprobar qué hace cada uno.
