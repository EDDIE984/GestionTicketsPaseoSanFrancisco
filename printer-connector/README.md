# Paseo Ticket Printer

Conector local para imprimir tickets ESC/POS sin vista previa del navegador.

## Comandos

```bash
npm run printer:server
```

Por defecto corre en modo `file`, que genera archivos binarios ESC/POS en:

```txt
printer-connector/data/spool
```

Esto sirve para probar la cola sin conectar la Epson.

Para levantar directo la Epson USB validada en macOS:

```bash
npm run printer:epson
```

## Seguridad local

Si existe `PRINTER_TOKEN`, el conector exige el header `X-Printer-Token` en todas las consultas.
El frontend usa `VITE_POS_PRINTER_TOKEN`, por eso ambos valores deben coincidir en `.env`.

## Servicio macOS

En cada computadora que imprimirá tickets, instala primero la Epson en macOS y confirma el nombre con:

```bash
lpstat -p
```

Luego instala el conector como servicio de usuario:

```bash
npm run printer:install:mac
```

El servicio arranca automáticamente al iniciar sesión y queda disponible en:

```txt
http://127.0.0.1:3010
```

Para desinstalarlo:

```bash
npm run printer:uninstall:mac
```

Si el nombre de la impresora cambia, instala indicando el nombre correcto:

```bash
PRINTER_NAME=NOMBRE_DE_LA_IMPRESORA npm run printer:install:mac
```

## Endpoints

```txt
GET  http://127.0.0.1:3010/health
GET  http://127.0.0.1:3010/jobs
POST http://127.0.0.1:3010/print-tickets
```

## Modo impresora de red

Para imprimir por TCP/IP:

```bash
PRINTER_MODE=tcp PRINTER_HOST=192.168.91.20 PRINTER_PORT=9100 npm run printer:server
```

## Modo impresora instalada en macOS/CUPS

Para impresora USB instalada en macOS:

```bash
PRINTER_MODE=system PRINTER_NAME=EPSON_TM_T20III npm run printer:server
```

El conector envía binarios ESC/POS con:

```bash
lp -d EPSON_TM_T20III -o raw archivo.bin
```

## Diseño optimizado

El ticket se imprime en texto ESC/POS puro para velocidad. Evita imprimir logo como imagen porque ralentiza mucho la Epson TM-T20.
