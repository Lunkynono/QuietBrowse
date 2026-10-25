# QuietBrowse

QuietBrowse será una extensión de Chrome para reducir anuncios, rastreadores y molestias mientras navegamos. El objetivo es que la navegación sea más limpia sin romper páginas, vídeos, inicios de sesión ni compras.

## Estado del proyecto

El proyecto está en fase de planificación. Las casillas se irán marcando cuando cada parte esté implementada y comprobada.

| Fase | v0.1 | v0.2 | v0.3 | v1.0 |
| --- | :---: | :---: | :---: | :---: |
| Base de la extensión MV3 y configuración inicial | ☐ | ☐ | ☐ | ☐ |
| Bloqueo de anuncios y rastreadores | ☐ | ☐ | ☐ | ☐ |
| Excepciones por sitio y pausa de protección | ☐ | ☐ | ☐ | ☐ |
| Filtros cosméticos y eliminación de molestias | ☐ | ☐ | ☐ | ☐ |
| Popup y página de ajustes en español | ☐ | ☐ | ☐ | ☐ |
| Copia de seguridad y restauración de configuración | ☐ | ☐ | ☐ | ☐ |
| Protección de YouTube en modo conservador | ☐ | ☐ | ☐ | ☐ |
| Pruebas, documentación e instalación local | ☐ | ☐ | ☐ | ☐ |

## Tecnologías y enfoque

Será una extensión Chrome Manifest V3 escrita en TypeScript, con React para el popup y la pantalla de ajustes. El filtrado de red se apoyará en `declarativeNetRequest` y en el motor MV3 de AdGuard, porque es más fiable mantener un motor de filtros existente que crear uno desde cero.

La configuración se guardará localmente en Chrome, sin cuentas ni telemetría. Vite se encargará de preparar la extensión y Vitest de comprobar la lógica. La prioridad será avanzar por partes, probar cada cambio y mantener una salida rápida cuando una web se comporte mal.

## Próximo paso

Definir y comenzar la primera versión cuando se dé la orden de iniciar el desarrollo.
