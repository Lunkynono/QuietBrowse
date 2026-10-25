# QuietBrowse

QuietBrowse es una extensión local de Chrome para reducir anuncios, rastreadores y algunas molestias de las páginas. La idea es navegar con menos ruido sin complicar el uso de las webs: si una falla, puedes desactivar la protección solo ahí.

## Estado del proyecto

La v0.2 añade los ajustes y controles de molestias. Una marca indica que la función está disponible en esa versión; las partes aún parciales se explican debajo.

| Fase | v0.1 | v0.2 | v0.3 | v1.0 |
| --- | :---: | :---: | :---: | :---: |
| Base de la extensión MV3 y configuración inicial | ✓ | ✓ | ☐ | ☐ |
| Bloqueo de anuncios y rastreadores | ✓ | ✓ | ☐ | ☐ |
| Excepciones por sitio y pausa de protección | ✓ | ✓ | ☐ | ☐ |
| Filtros de cookies y molestias | ☐ | ✓ | ☐ | ☐ |
| Popup y página de ajustes en español | ☐ | ✓ | ☐ | ☐ |
| Selector de elementos y reglas personales | ☐ | ✓ | ☐ | ☐ |
| Copia de seguridad y restauración de configuración | ☐ | ✓ | ☐ | ☐ |
| Protección de YouTube en modo conservador | ☐ | Parcial | ☐ | ☐ |
| Pruebas, documentación e instalación local | ☐ | ✓ | ☐ | ☐ |

## Tecnologías y enfoque

La base usa Chrome Manifest V3 y TypeScript. El popup y los ajustes están hechos con React. Para bloquear peticiones usamos `declarativeNetRequest` y el motor MV3 de AdGuard: aprovechar un motor mantenido evita inventar un sistema de filtros propio.

La configuración se guarda en Chrome, sin cuentas ni telemetría. Webpack prepara la extensión completa y Vitest comprueba la lógica; también hay una prueba de navegador con Chromium y un perfil temporal. Las listas se empaquetan en la compilación, así que la protección básica no necesita conexión para arrancar.

## Probarla en Chrome

Con Node.js 22 o posterior, ejecuta `npm ci`, `npm run build` y carga la carpeta `D:\Proyectos\AdBlock\dist` desde `chrome://extensions` → «Modo de desarrollador» → «Cargar descomprimida». Los pasos detallados están en [la guía de instalación](docs/INSTALL_WINDOWS.md).

Para comprobar el proyecto: `npm run verify`. La prueba de navegador se ejecuta con `npm run test:e2e` después de instalar Chromium mediante `npx playwright install chromium`.

Puedes elegir perfil equilibrado o intensivo, activar las listas de anuncios, rastreadores, cookies y pop-ups, gestionar excepciones, ocultar un elemento concreto y exportar/importar tus ajustes. Los temas claro, oscuro y del sistema también están disponibles. Tras cambiar filtros o excepciones, recarga las pestañas abiertas. Las listas y los iconos se empaquetan al compilar; no hay servidor, cuenta ni telemetría.

Ocultar un aviso de cookies **no** equivale a rechazar cookies. No hay rechazo automático, limpieza de parámetros de URL, cierre automático de pestañas ni limpieza general de vídeos flotantes: podrían romper consentimientos, enlaces o reproductores legítimos. YouTube usa las listas y oculta algunas tarjetas publicitarias conocidas sin tocar el reproductor, pero no se ha comprobado contra anuncios reales ni se garantiza bloquear los anuncios del vídeo. Consulta [el estado detallado](docs/IMPLEMENTATION_STATUS.md) y [las pruebas](docs/TEST_PLAN.md).

`npm run filters:update` selecciona una nueva versión de las listas; después hay que ejecutar `npm install`, `npm run verify`, `npm run test:e2e` y recargar la extensión. [Más detalles](docs/FILTER_UPDATES.md).

El repositorio nació como `adblock` y ahora se llama `QuietBrowse`. El código y las dependencias de AdGuard se distribuyen bajo GPL-3.0-only; consulta [la licencia](LICENSE) y [los avisos de terceros](THIRD_PARTY_NOTICES.md).
