# Instaladores de la consola POS

La pantalla `Configuración > Impresora POS` descarga estos archivos:

- `/installers/paseo-ticket-printer-mac.dmg`
- `/installers/paseo-ticket-printer-windows.exe`

## Generar desde GitHub

1. Subir los cambios al repositorio.
2. Ir a GitHub > Actions > `Build printer installers`.
3. Ejecutar `Run workflow`.
4. Descargar los artefactos:
   - `paseo-ticket-printer-mac`
   - `paseo-ticket-printer-windows`
5. Copiar los archivos generados en:
   - `public/installers/paseo-ticket-printer-mac.dmg`
   - `public/installers/paseo-ticket-printer-windows.exe`
6. Hacer commit y push.
7. Vercel publicará esos instaladores junto con el sistema.

## Generar localmente

En macOS:

```bash
npm run installer:mac
```

En Windows:

```powershell
npm run installer:windows
```

## Requisitos en cada caja

Los instaladores actuales usan Node.js instalado en la computadora.
Antes de instalar la consola POS, instala Node.js LTS.

En macOS el instalador crea un LaunchAgent.
En Windows el instalador crea una tarea programada al iniciar sesión.

## Nombres de impresora

Por defecto se usa:

```txt
EPSON_TM_T20III
```

Si una caja usa otro nombre, ejecutar el instalador con `PRINTER_NAME` configurado.
