export interface PosTicket {
  ticketNumero: string;
  cedula: string;
  nombre: string;
  telefono: string;
  fechaHora: string;
  local: string;
}

export interface PosPrinterHealth {
  status: string;
  secure?: boolean;
  mode: string;
  printerName: string | null;
  machineId: string;
  localIp: string;
  queue: {
    pending: number;
    printing: number;
    failed: number;
    cancelled?: number;
  };
}

export interface PosPrinterJob {
  id: string;
  source: string;
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  totalTickets: number;
  printedTickets: number;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  startedAt?: string;
  completedAt?: string;
}

const printerUrl = (import.meta.env.VITE_POS_PRINTER_URL as string | undefined) ?? 'http://localhost:3010';
const printerToken = import.meta.env.VITE_POS_PRINTER_TOKEN as string | undefined;

function printerHeaders(extra?: HeadersInit) {
  return {
    ...(printerToken ? { 'X-Printer-Token': printerToken } : {}),
    ...extra,
  };
}

export async function checkPosPrinter() {
  const response = await fetch(`${printerUrl}/health`, {
    headers: printerHeaders(),
  });
  if (!response.ok) throw new Error('No se detectó la consola de impresión');
  return response.json() as Promise<PosPrinterHealth>;
}

export async function fetchPosPrinterJobs() {
  const response = await fetch(`${printerUrl}/jobs`, {
    headers: printerHeaders(),
  });
  if (!response.ok) throw new Error('No se pudo consultar la cola de impresión');
  const data = await response.json();
  return (data.jobs ?? []) as PosPrinterJob[];
}

export async function fetchPosPrinterJob(jobId: string) {
  const response = await fetch(`${printerUrl}/jobs/${encodeURIComponent(jobId)}`, {
    headers: printerHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo consultar el trabajo de impresión');
  }
  return data as PosPrinterJob;
}

export async function enviarTicketsACola(tickets: PosTicket[]) {
  const response = await fetch(`${printerUrl}/print-tickets`, {
    method: 'POST',
    headers: printerHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      source: 'registro',
      tickets,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo enviar tickets a la consola de impresión');
  }

  return data as Promise<{ accepted: boolean; jobId: string; totalTickets: number }>;
}

export async function cancelarColaImpresion() {
  const response = await fetch(`${printerUrl}/cancel-queue`, {
    method: 'POST',
    headers: printerHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'No se pudo cancelar la cola de impresión');
  }

  return data as Promise<{
    cancelled: boolean;
    systemQueueCancelled: boolean;
    localJobsCancelled: number;
  }>;
}

export async function esperarTrabajoImpresion(jobId: string, options = { timeoutMs: 120000, intervalMs: 1000 }) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < options.timeoutMs) {
    const job = await fetchPosPrinterJob(jobId);

    if (job.status === 'completed') return job;
    if (job.status === 'failed') {
      throw new Error(job.error || 'La consola local no pudo completar la impresión');
    }

    await new Promise((resolve) => window.setTimeout(resolve, options.intervalMs));
  }

  throw new Error('La impresión sigue en proceso. Revisa la cola de la consola local antes de reintentar.');
}

export async function imprimirTicketPrueba() {
  return enviarTicketsACola([
    {
      ticketNumero: `TEST-${Date.now()}`,
      cedula: 'XXXXXXX465',
      nombre: 'PRUEBA DE IMPRESION',
      telefono: '0999999999',
      fechaHora: new Date().toLocaleString('es-EC', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
      local: 'CONSOLA LOCAL',
    },
  ]);
}
