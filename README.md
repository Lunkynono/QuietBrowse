# QuietBrowse

QuietBrowse es una extensión local de Chrome para reducir anuncios y rastreadores. Queremos una navegación más limpia sin complicar el uso de las webs; por eso cada sitio se puede excluir con un clic.

## Estado del proyecto

La v0.1 ya incluye la base y el bloqueo de red. Una casilla marcada significa que esa parte está implementada y comprobada en la versión indicada.

| Fase | v0.1 | v0.2 | v0.3 | v1.0 |
| --- | :---: | :---: | :---: | :---: |
| Base de la extensión MV3 y configuración inicial | ✓ | ☐ | ☐ | ☐ |
| Bloqueo de anuncios y rastreadores | ✓ | ☐ | ☐ | ☐ |
| Excepciones por sitio y pausa de protección | ✓ | ☐ | ☐ | ☐ |
| Filtros cosméticos y eliminación de molestias | ☐ | ☐ | ☐ | ☐ |
| Popup y página de ajustes en español | ☐ | ☐ | ☐ | ☐ |
| Copia de seguridad y restauración de configuración | ☐ | ☐ | ☐ | ☐ |
| Protección de YouTube en modo conservador | ☐ | ☐ | ☐ | ☐ |
| Pruebas, documentación e instalación local | ☐ | ☐ | ☐ | ☐ |

## Tecnologías y enfoque

La base usa Chrome Manifest V3 y TypeScript. El popup está hecho con React. Para bloquear peticiones usamos `declarativeNetRequest` y el motor MV3 de AdGuard: aprovechar un motor mantenido evita inventar un sistema de filtros propio.

La configuración se guarda en Chrome, sin cuentas ni telemetría. Webpack prepara la extensión completa y Vitest comprueba la lógica; también hay una prueba de navegador con Chromium y un perfil temporal. Las listas se empaquetan en la compilación, así que la protección básica no necesita conexión para arrancar.

## Probarla en Chrome

Con Node.js 22 o posterior, ejecuta `npm ci`, `npm run build` y carga la carpeta `D:\Proyectos\AdBlock\dist` desde `chrome://extensions` → «Modo de desarrollador» → «Cargar descomprimida». Los pasos detallados están en [la guía de instalación](docs/INSTALL_WINDOWS.md).

Para comprobar el proyecto: `npm run verify`. La prueba de navegador se ejecuta con `npm run test:e2e` después de instalar Chromium mediante `npx playwright install chromium`.

Esta primera versión bloquea peticiones de anuncios y seguimiento y permite pausar la protección globalmente o en la web actual. Tras cambiar la excepción de una web, recarga la pestaña. El popup es básico; los ajustes avanzados, las molestias, las copias de seguridad y el tratamiento específico de YouTube quedan para próximas versiones. El bloqueo de YouTube no está verificado y no se promete que desaparezcan todos sus anuncios.

El repositorio nació como `adblock` y ahora se llama `QuietBrowse`. El código y las dependencias de AdGuard se distribuyen bajo GPL-3.0-only; consulta [la licencia](LICENSE) y [los avisos de terceros](THIRD_PARTY_NOTICES.md).
