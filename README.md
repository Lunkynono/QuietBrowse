# QuietBrowse

QuietBrowse ayuda a navegar con menos anuncios, rastreadores y avisos molestos. Si una web deja de funcionar bien, puedes pausar la protección solo en esa web y volver a activarla cuando quieras.

## Qué puedes hacer

- Encender o pausar la protección para todas las webs o solo para la que tienes abierta.
- Elegir cuánto quieres bloquear y ocultar un elemento concreto de una página.
- Cambiar entre aspecto claro, oscuro o automático y escoger el color principal.
- Ver los bloqueos registrados en la página actual y el total guardado en tu navegador.
- Guardar una copia de tus preferencias para recuperarlas más adelante.

El contador registra los anuncios y rastreadores que QuietBrowse llega a detectar. No es una cifra exacta: algunos bloqueos pueden no aparecer. El número de la página empieza de cero al cargarla de nuevo; el total se conserva hasta que lo reinicies desde «Mis datos». Las cifras y los ajustes se guardan en tu navegador, sin enviarse a ningún servidor.

## Instalar en Chrome

QuietBrowse todavía se instala manualmente. Descarga el código, sigue [estos pasos para Windows](docs/INSTALL_WINDOWS.md) y, cuando Chrome pida una carpeta, elige `dist`. Si ya la tenías instalada, vuelve a preparar esa carpeta y pulsa «Actualizar» en `chrome://extensions`.

## Cómo va el proyecto

| Fase | v0.1 | v0.2 | v0.3 | v1.0 |
| --- | :---: | :---: | :---: | :---: |
| Bloqueo básico y pausa por web | ✓ | ✓ | ✓ |  |
| Más filtros y ajustes personales |  | ✓ | ✓ |  |
| Mejoras para YouTube, sin tocar el reproductor |  | Parcial | Parcial |  |
| Interfaz renovada y colores a elegir |  |  | ✓ |  |
| Contador de bloqueos registrados |  |  | ✓ |  |
| Pruebas en más webs y navegadores |  |  |  | Pendiente |

YouTube cambia con frecuencia. QuietBrowse oculta algunas partes publicitarias, pero no promete quitar todos los anuncios de los vídeos. Si algo falla, puedes desactivar la protección de YouTube en los ajustes.

## Para quien quiera mirar el código

Está hecha para Chrome con Manifest V3, TypeScript y React. Usamos las listas y el motor de AdGuard para mantener el bloqueo sin montar un sistema propio; los filtros van incluidos en la extensión. Todo funciona en el navegador, sin cuentas ni seguimiento. Las comprobaciones del proyecto se ejecutan con `npm run verify` y `npm run test:e2e`. Hay más detalle en [el estado técnico](docs/IMPLEMENTATION_STATUS.md).

El código se publica bajo GPL-3.0-only. Consulta [la licencia](LICENSE) y [los avisos de terceros](THIRD_PARTY_NOTICES.md).
