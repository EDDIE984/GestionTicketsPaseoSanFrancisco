import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Ban, BookOpen, CheckCircle2, Clock3, Download, Laptop, LoaderCircle, Monitor, Printer, RefreshCcw, Send, TriangleAlert, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { cancelarColaImpresion, checkPosPrinter, fetchPosPrinterJobs, imprimirTicketPrueba, type PosPrinterHealth, type PosPrinterJob } from '@/lib/api/pos-printer';

const estadoClase: Record<PosPrinterJob['status'], string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  printing: 'border-blue-200 bg-blue-50 text-blue-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-700',
};

const estadoTexto: Record<PosPrinterJob['status'], string> = {
  pending: 'Pendiente',
  printing: 'Imprimiendo',
  completed: 'Completado',
  failed: 'Error',
  cancelled: 'Cancelado',
};

const instaladores = [
  {
    sistema: 'macOS',
    detalle: 'Instalador para cajas Mac con impresora USB Epson.',
    archivo: '/installers/paseo-ticket-printer-mac.dmg',
    nombre: 'paseo-ticket-printer-mac.dmg',
    icon: Laptop,
  },
  {
    sistema: 'Windows',
    detalle: 'Paquete instalador para cajas Windows con impresora POS configurada.',
    archivo: '/installers/paseo-ticket-printer-windows.zip',
    nombre: 'paseo-ticket-printer-windows.zip',
    icon: Monitor,
  },
];

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function ImpresoraPOS() {
  const navigate = useNavigate();
  const [health, setHealth] = useState<PosPrinterHealth | null>(null);
  const [jobs, setJobs] = useState<PosPrinterJob[]>([]);
  const [cargando, setCargando] = useState(true);
  const [probando, setProbando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState('');

  const trabajosRecientes = useMemo(() => jobs.slice().reverse().slice(0, 8), [jobs]);

  const cargarEstado = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError('');
    try {
      const [estado, cola] = await Promise.all([checkPosPrinter(), fetchPosPrinterJobs()]);
      setHealth(estado);
      setJobs(cola);
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'No se pudo conectar con la consola local';
      setError(mensaje);
      setHealth(null);
      setJobs([]);
      if (!silencioso) toast.error(mensaje);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargarEstado();
    const interval = window.setInterval(() => cargarEstado(true), 5000);
    return () => window.clearInterval(interval);
  }, []);

  const probarImpresion = async () => {
    setProbando(true);
    try {
      const job = await imprimirTicketPrueba();
      toast.success(`Ticket de prueba enviado a la cola ${job.jobId}`);
      await cargarEstado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo imprimir el ticket de prueba');
    } finally {
      setProbando(false);
    }
  };

  const cancelarCola = async () => {
    const confirmado = window.confirm('Se cancelarán los trabajos pendientes de la impresora POS en esta computadora. ¿Deseas continuar?');
    if (!confirmado) return;

    setCancelando(true);
    try {
      const result = await cancelarColaImpresion();
      toast.success(`Cola cancelada. Trabajos locales cancelados: ${result.localJobsCancelled}`);
      await cargarEstado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar la cola de impresión');
    } finally {
      setCancelando(false);
    }
  };

  const conectado = Boolean(health);
  const procesando = cargando || probando || cancelando;

  return (
    <div className="p-8">
      {procesando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-slate-200">
            <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] bg-slate-900" />
          </div>
          <div className="flex min-w-64 items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-lg">
            <LoaderCircle className="h-6 w-6 animate-spin text-slate-900" />
            <span className="text-sm font-medium text-slate-800">
              {cancelando ? 'Cancelando cola de impresión...' : probando ? 'Enviando ticket de prueba...' : 'Consultando consola local...'}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/configuracion')}
        className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Configuración
      </button>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl text-gray-900">Impresora POS</h1>
          <p className="max-w-3xl text-gray-600">
            Estado de la consola local que recibe los tickets del sistema y los envía a la ticketera instalada en esta caja.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/configuracion/impresora-pos/manual')}>
            <BookOpen className="h-4 w-4" />
            Manual
          </Button>
          <Button variant="outline" onClick={() => cargarEstado()} disabled={cargando}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800" onClick={probarImpresion} disabled={!conectado || probando}>
            <Send className="h-4 w-4" />
            Ticket de prueba
          </Button>
          <Button variant="destructive" onClick={cancelarCola} disabled={!conectado || cancelando}>
            <Ban className="h-4 w-4" />
            Cancelar cola
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Conexión local</CardTitle>
            <CardDescription>Debe estar activa en cada computadora que imprima tickets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className={`flex items-center justify-between rounded-lg border p-4 ${conectado ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div>
                <p className="text-sm text-slate-600">Estado</p>
                <p className={`text-lg font-semibold ${conectado ? 'text-emerald-800' : 'text-red-800'}`}>
                  {conectado ? 'Conectada' : 'No detectada'}
                </p>
              </div>
              {conectado ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
            </div>

            {error && (
              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-white p-3">
                <p className="text-slate-500">Equipo</p>
                <p className="mt-1 break-all font-medium text-slate-900">{health?.machineId ?? '-'}</p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-slate-500">IP local</p>
                <p className="mt-1 font-medium text-slate-900">{health?.localIp ?? '-'}</p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-slate-500">Modo</p>
                <p className="mt-1 font-medium text-slate-900">{health?.mode ?? '-'}</p>
              </div>
              <div className="rounded-lg border bg-white p-3">
                <p className="text-slate-500">Impresora</p>
                <p className="mt-1 break-all font-medium text-slate-900">{health?.printerName ?? '-'}</p>
              </div>
              <div className="rounded-lg border bg-white p-3 sm:col-span-2">
                <p className="text-slate-500">Seguridad</p>
                <p className="mt-1 font-medium text-slate-900">
                  {health ? (health.secure ? 'Token local activo' : 'Sin token configurado') : '-'}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-slate-950 p-4 text-white">
              <div className="mb-3 flex items-center gap-2">
                <Printer className="h-4 w-4" />
                <p className="font-medium">Cola actual</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-semibold">{health?.queue.pending ?? 0}</p>
                  <p className="text-xs text-slate-300">Pendientes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{health?.queue.printing ?? 0}</p>
                  <p className="text-xs text-slate-300">Imprimiendo</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{health?.queue.failed ?? 0}</p>
                  <p className="text-xs text-slate-300">Errores</p>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Cancelados: {health?.queue.cancelled ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Instaladores</CardTitle>
              <CardDescription>Descarga la consola local para cada computadora de impresión.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {instaladores.map((instalador) => {
                const Icon = instalador.icon;
                return (
                  <a
                    key={instalador.archivo}
                    href={instalador.archivo}
                    download={instalador.nombre}
                    className="flex items-center justify-between gap-4 rounded-lg border bg-white p-4 transition-colors hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-medium text-slate-900">{instalador.sistema}</span>
                        <span className="block text-sm text-slate-500">{instalador.detalle}</span>
                      </span>
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                      <Download className="h-4 w-4" />
                    </span>
                  </a>
                );
              })}
              <p className="text-xs text-slate-500">
                Los archivos deben publicarse en la carpeta pública installers con esos nombres para que la descarga quede activa.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Trabajos recientes</CardTitle>
            <CardDescription>Últimas órdenes recibidas por la consola local.</CardDescription>
          </CardHeader>
          <CardContent>
            {trabajosRecientes.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50 text-center text-slate-500">
                <Clock3 className="mb-2 h-8 w-8" />
                <p>No hay trabajos registrados en esta consola.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Trabajo</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Tickets</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-white">
                    {trabajosRecientes.map((job) => (
                      <tr key={job.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{job.id}</p>
                          <p className="text-xs text-slate-500">{job.source}</p>
                          {job.error && <p className="mt-1 text-xs text-red-600">{job.error}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={estadoClase[job.status]}>
                            {estadoTexto[job.status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {job.printedTickets}/{job.totalTickets}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(job.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
