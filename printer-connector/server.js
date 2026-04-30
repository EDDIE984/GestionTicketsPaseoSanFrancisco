import fs from 'node:fs';
import { execFile } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const PORT = Number(process.env.PRINTER_CONNECTOR_PORT || 3010);
const HOST = process.env.PRINTER_CONNECTOR_HOST || '127.0.0.1';
const MODE = process.env.PRINTER_MODE || 'file';
const PRINTER_HOST = process.env.PRINTER_HOST || '';
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);
const PRINTER_NAME = process.env.PRINTER_NAME || '';
const DATA_DIR = path.resolve(process.env.PRINTER_DATA_DIR || 'printer-connector/data');
const QUEUE_FILE = path.join(DATA_DIR, 'queue.json');
const SPOOL_DIR = path.join(DATA_DIR, 'spool');
const PAPER_CHARS = 42;

function loadLocalEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const row of content.split(/\r?\n/)) {
    const line = row.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (key.startsWith('PRINTER_') && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const PRINTER_TOKEN = process.env.PRINTER_TOKEN || '';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(SPOOL_DIR, { recursive: true });

let queue = loadQueue();
let processing = false;

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveQueue() {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const values of Object.values(interfaces)) {
    for (const item of values || []) {
      if (item.family === 'IPv4' && !item.internal) return item.address;
    }
  }
  return '127.0.0.1';
}

function json(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Printer-Token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  response.end(JSON.stringify(payload));
}

function isAuthorized(request) {
  if (!PRINTER_TOKEN) return true;
  return request.headers['x-printer-token'] === PRINTER_TOKEN;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error('Payload demasiado grande'));
        request.destroy();
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    request.on('error', reject);
  });
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function line(label, value) {
  return `${label}: ${normalizeText(value)}`;
}

function center(text) {
  const value = normalizeText(text).slice(0, PAPER_CHARS);
  const padding = Math.max(Math.floor((PAPER_CHARS - value.length) / 2), 0);
  return `${' '.repeat(padding)}${value}`;
}

function wrap(text, width = PAPER_CHARS) {
  const value = normalizeText(text);
  const words = value.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (`${current} ${word}`.trim().length > width) {
      if (current) lines.push(current);
      current = word.slice(0, width);
    } else {
      current = `${current} ${word}`.trim();
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function buildTicketBuffer(ticket) {
  const parts = [];
  const esc = (...bytes) => Buffer.from(bytes);
  const text = (value = '') => Buffer.from(`${value}\n`, 'ascii');

  parts.push(esc(0x1b, 0x40)); // init
  parts.push(esc(0x1b, 0x61, 0x01)); // center
  parts.push(esc(0x1b, 0x45, 0x01)); // bold
  parts.push(text(center('PASEO SAN FRANCISCO')));
  parts.push(esc(0x1b, 0x45, 0x00));
  parts.push(text(center(`Ticket #: ${ticket.ticketNumero}`)));
  parts.push(text('-'.repeat(PAPER_CHARS)));
  parts.push(esc(0x1b, 0x61, 0x00)); // left
  parts.push(text(line('Cedula', ticket.cedula)));
  for (const row of wrap(line('Nombre', ticket.nombre))) parts.push(text(row));
  parts.push(text(line('Telefono', ticket.telefono)));
  parts.push(text(line('Fecha/Hora', ticket.fechaHora)));
  for (const row of wrap(line('Local', ticket.local))) parts.push(text(row));
  parts.push(text('-'.repeat(PAPER_CHARS)));
  parts.push(esc(0x1b, 0x61, 0x01));
  parts.push(text(center(`${ticket.index} de ${ticket.total}`)));
  parts.push(text('\n'));
  parts.push(esc(0x1d, 0x56, 0x42, 0x00)); // cut

  return Buffer.concat(parts);
}

async function writeToTcp(buffer) {
  if (!PRINTER_HOST) throw new Error('Falta PRINTER_HOST para PRINTER_MODE=tcp');

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: PRINTER_HOST, port: PRINTER_PORT }, () => {
      socket.write(buffer, (error) => {
        if (error) reject(error);
        socket.end();
      });
    });
    socket.on('close', resolve);
    socket.on('error', reject);
    socket.setTimeout(15000, () => {
      socket.destroy(new Error('Timeout conectando a impresora'));
    });
  });
}

async function writeToSystemPrinter(buffer) {
  if (!PRINTER_NAME) throw new Error('Falta PRINTER_NAME para PRINTER_MODE=system');

  const tempFile = path.join(
    DATA_DIR,
    `print-${Date.now()}-${Math.random().toString(16).slice(2)}.bin`
  );
  fs.writeFileSync(tempFile, buffer);

  try {
    await new Promise((resolve, reject) => {
      execFile('lp', ['-d', PRINTER_NAME, '-o', 'raw', tempFile], (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message));
          return;
        }
        resolve();
      });
    });
  } finally {
    fs.rmSync(tempFile, { force: true });
  }
}

async function cancelSystemPrinterQueue() {
  if (MODE !== 'system') return false;
  if (!PRINTER_NAME) throw new Error('Falta PRINTER_NAME para cancelar la cola');

  await new Promise((resolve, reject) => {
    execFile('cancel', ['-a', PRINTER_NAME], (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve();
    });
  });

  return true;
}

function cancelLocalQueue() {
  const now = new Date().toISOString();
  let cancelled = 0;

  queue = queue.map((job) => {
    if (job.status !== 'pending' && job.status !== 'printing') return job;

    cancelled += 1;
    return {
      ...job,
      status: 'cancelled',
      error: 'Trabajo cancelado por el usuario',
      updatedAt: now,
      cancelledAt: now,
    };
  });

  saveQueue();
  return cancelled;
}

async function printTicket(job, ticket) {
  const buffer = buildTicketBuffer(ticket);

  if (MODE === 'tcp') {
    await writeToTcp(buffer);
    return;
  }

  if (MODE === 'system') {
    await writeToSystemPrinter(buffer);
    return;
  }

  const filePath = path.join(
    SPOOL_DIR,
    `${job.id}-${String(ticket.index).padStart(5, '0')}.bin`
  );
  fs.writeFileSync(filePath, buffer);
}

async function printRemainingTickets(job) {
  const remainingTickets = job.tickets.slice(job.printedTickets);

  if (MODE === 'system' || MODE === 'tcp') {
    const buffer = Buffer.concat(remainingTickets.map((ticket) => buildTicketBuffer(ticket)));

    if (MODE === 'system') {
      await writeToSystemPrinter(buffer);
    } else {
      await writeToTcp(buffer);
    }

    job.printedTickets = job.tickets.length;
    job.updatedAt = new Date().toISOString();
    saveQueue();
    return;
  }

  for (let index = job.printedTickets; index < job.tickets.length; index += 1) {
    await printTicket(job, job.tickets[index]);
    job.printedTickets = index + 1;
    job.updatedAt = new Date().toISOString();
    saveQueue();
  }
}

async function processQueue() {
  if (processing) return;
  processing = true;

  try {
    while (true) {
      const job = queue.find((item) => item.status === 'pending' || item.status === 'printing');
      if (!job) break;

      job.status = 'printing';
      job.startedAt ||= new Date().toISOString();
      saveQueue();

      try {
        await printRemainingTickets(job);

        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.updatedAt = new Date().toISOString();
        saveQueue();
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : String(error);
        job.updatedAt = new Date().toISOString();
        saveQueue();
        break;
      }
    }
  } finally {
    processing = false;
  }
}

function createJob(payload) {
  const tickets = Array.isArray(payload.tickets) ? payload.tickets : [];
  if (tickets.length === 0) throw new Error('No hay tickets para imprimir');

  const now = new Date().toISOString();
  const job = {
    id: `JOB-${Date.now()}`,
    source: payload.source || 'registro',
    status: 'pending',
    totalTickets: tickets.length,
    printedTickets: 0,
    tickets: tickets.map((ticket, index) => ({
      ...ticket,
      index: index + 1,
      total: tickets.length,
    })),
    createdAt: now,
    updatedAt: now,
    error: null,
  };

  queue.push(job);
  saveQueue();
  processQueue();
  return job;
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    return json(response, 204, {});
  }

  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  try {
    if (!isAuthorized(request)) {
      return json(response, 401, { message: 'Token de impresora inválido o ausente' });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return json(response, 200, {
        status: 'ok',
        secure: Boolean(PRINTER_TOKEN),
        mode: MODE,
        printerName: PRINTER_NAME || null,
        machineId: os.hostname(),
        localIp: getLocalIp(),
        queue: {
          pending: queue.filter((job) => job.status === 'pending').length,
          printing: queue.filter((job) => job.status === 'printing').length,
          failed: queue.filter((job) => job.status === 'failed').length,
          cancelled: queue.filter((job) => job.status === 'cancelled').length,
        },
      });
    }

    if (request.method === 'GET' && url.pathname === '/jobs') {
      return json(response, 200, { jobs: queue.map(({ tickets, ...job }) => job) });
    }

    if (request.method === 'GET' && url.pathname.startsWith('/jobs/')) {
      const jobId = decodeURIComponent(url.pathname.replace('/jobs/', ''));
      const job = queue.find((item) => item.id === jobId);
      if (!job) return json(response, 404, { message: 'Trabajo no encontrado' });
      const { tickets, ...publicJob } = job;
      return json(response, 200, publicJob);
    }

    if (request.method === 'POST' && url.pathname === '/print-tickets') {
      const payload = await readBody(request);
      const job = createJob(payload);
      return json(response, 202, {
        accepted: true,
        jobId: job.id,
        totalTickets: job.totalTickets,
      });
    }

    if (request.method === 'POST' && url.pathname === '/cancel-queue') {
      const systemQueueCancelled = await cancelSystemPrinterQueue();
      const localJobsCancelled = cancelLocalQueue();
      return json(response, 200, {
        cancelled: true,
        systemQueueCancelled,
        localJobsCancelled,
      });
    }

    return json(response, 404, { message: 'Ruta no encontrada' });
  } catch (error) {
    return json(response, 500, {
      message: error instanceof Error ? error.message : 'Error interno',
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Paseo Ticket Printer escuchando en http://${HOST}:${PORT}`);
  const modeDetail =
    MODE === 'tcp'
      ? ` (${PRINTER_HOST}:${PRINTER_PORT})`
      : MODE === 'system'
        ? ` (${PRINTER_NAME || 'sin PRINTER_NAME'})`
        : ` (spool ${SPOOL_DIR})`;
  console.log(`Modo: ${MODE}${modeDetail}`);
});
