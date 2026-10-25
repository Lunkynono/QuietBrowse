# Instalación local en Windows

1. Instala Node.js 22 o posterior.
2. Abre una terminal en `D:\Proyectos\AdBlock` y ejecuta `npm ci` y después `npm run build`. En PowerShell usa `npm.cmd` si la política de ejecución bloquea `npm.ps1`.
3. Abre `chrome://extensions`, activa «Modo de desarrollador» y pulsa «Cargar descomprimida».
4. Selecciona `D:\Proyectos\AdBlock\dist` y, si quieres, fija el icono de QuietBrowse en la barra.
5. Abre una web normal y comprueba el estado desde el popup. Para distinguir su efecto del de otro bloqueador, desactiva temporalmente el otro bloqueador durante la prueba.

Si una web falla, desactiva «Protección en esta web» y recarga la pestaña. El interruptor general pausa la protección en todas las webs. Si actualizas el código o los filtros, ejecuta de nuevo `npm run build` y pulsa «Recargar» en la tarjeta de QuietBrowse dentro de `chrome://extensions`.

La extensión se ha probado en un Chromium aislado mediante Playwright. No se ha instalado ni probado en tu perfil personal de Chrome.
