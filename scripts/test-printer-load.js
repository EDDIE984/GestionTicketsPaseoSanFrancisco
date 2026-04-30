import fs from 'node:fs';

function loadEnv() {
  if (!fs.existsSync('.env')) return {};
  return Object.fromEntries(
    fs
      .readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, '')];
      })
  );
}

const env = loadEnv();
const count = Number(process.argv[2] || 1);
const confirmed = process.argv.includes('--confirm');
const startArg = process.argv.find((arg) => arg.startsWith('--start='));
const startAt = Number(startArg?.split('=')[1] || 1);
const printerUrl = env.VITE_POS_PRINTER_URL || 'http://127.0.0.1:3010';
const printerToken = env.VITE_POS_PRINTER_TOKEN || env.PRINTER_TOKEN || '';

if (!Number.isInteger(count) || count <= 0) {
  console.error('Cantidad inválida. Ejemplo: npm run printer:test-load -- 3500 --confirm');
  process.exit(1);
}

if (!Number.isInteger(startAt) || startAt <= 0) {
  console.error('Inicio inválido. Ejemplo: npm run printer:test-load -- 2979 --start=522 --confirm');
  process.exit(1);
}

if (!confirmed) {
  console.error('Falta --confirm para evitar impresiones masivas accidentales.');
  console.error(`Ejemplo: npm run printer:test-load -- ${count} --confirm`);
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  ...(printerToken ? { 'X-Printer-Token': printerToken } : {}),
};

const now = new Date().toLocaleString('es-EC', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const tickets = Array.from({ length: count }, (_, index) => ({
  ticketNumero: `LOAD-${String(startAt + index).padStart(5, '0')}`,
  cedula: 'XXXXXXX465',
  nombre: 'PRUEBA CARGA IMPRESION',
  telefono: '0999999999',
  fechaHora: now,
  local: 'PRUEBA MASIVA',
}));

console.log(`Enviando ${count} tickets a ${printerUrl}...`);

const response = await fetch(`${printerUrl}/print-tickets`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    source: 'prueba-carga',
    tickets,
  }),
});

const data = await response.json().catch(() => ({}));

if (!response.ok) {
  console.error('No se pudo enviar la prueba masiva.');
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
