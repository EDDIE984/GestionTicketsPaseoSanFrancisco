import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Receipt,
  ShoppingCart,
  Store,
  Ticket,
  TrendingUp,
} from 'lucide-react';
import {
  fetchEventosReporteria,
  fetchFacturasReporteria,
  type ReporteriaEvento,
  type ReporteriaFactura,
} from '@/lib/api/reporteria';

const meses = [
  { valor: 0, nombre: 'enero' },
  { valor: 1, nombre: 'febrero' },
  { valor: 2, nombre: 'marzo' },
  { valor: 3, nombre: 'abril' },
  { valor: 4, nombre: 'mayo' },
  { valor: 5, nombre: 'junio' },
  { valor: 6, nombre: 'julio' },
  { valor: 7, nombre: 'agosto' },
  { valor: 8, nombre: 'septiembre' },
  { valor: 9, nombre: 'octubre' },
  { valor: 10, nombre: 'noviembre' },
  { valor: 11, nombre: 'diciembre' },
];

const COLORS = ['#0f766e', '#2563eb', '#c2410c', '#9333ea', '#ca8a04', '#4f46e5'];

function formatMiles(value: number | string | null | undefined, decimals = 0) {
  const parsed = parseNumber(value);
  const fixed = parsed.toFixed(decimals);
  const [integerPart, decimalPart] = fixed.split('.');
  const integerWithThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimalPart ? `${integerWithThousands},${decimalPart}` : integerWithThousands;
}

function formatMoney(value: number | string | null | undefined) {
  return `$ ${formatMiles(value, 2)}`;
}

function parseNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDateParts(dateValue: string) {
  const [year, month, day] = dateValue.split('T')[0].split('-').map(Number);
  return {
    year,
    month: (month || 1) - 1,
    day: day || 1,
  };
}

function formatDate(dateValue: string | null | undefined) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getConsentimiento(factura: ReporteriaFactura) {
  return factura.clientes?.formularios_consentimiento?.[0] ?? null;
}

function getClienteNombre(factura: ReporteriaFactura) {
  return `${factura.clientes?.nombre ?? ''} ${factura.clientes?.apellido ?? ''}`.trim();
}

function getMetodosPago(factura: ReporteriaFactura) {
  return factura.factura_metodos_pago
    .map((metodo) => `${metodo.metodos_pago?.nombre ?? 'Sin método'} ${formatMoney(metodo.monto)}`)
    .join(' | ');
}

function getCupones(factura: ReporteriaFactura) {
  return factura.factura_metodos_pago
    .filter((metodo) => metodo.cupones?.nombre)
    .map((metodo) => `${metodo.cupones?.nombre} x${metodo.cupon_numero ?? 0}`)
    .join(' | ');
}

export function Reporteria() {
  const [eventos, setEventos] = useState<ReporteriaEvento[]>([]);
  const [facturas, setFacturas] = useState<ReporteriaFactura[]>([]);
  const [campaniaSeleccionada, setCampaniaSeleccionada] = useState('');
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([]);
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);

  useEffect(() => {
    fetchEventosReporteria()
      .then((data) => {
        setEventos(data);
        setCampaniaSeleccionada(data[0]?.id ?? '');
      })
      .catch(() => toast.error('Error al cargar campañas para reportería'))
      .finally(() => setCargandoEventos(false));
  }, []);

  useEffect(() => {
    if (!campaniaSeleccionada) {
      setFacturas([]);
      return;
    }

    setCargandoFacturas(true);
    fetchFacturasReporteria(campaniaSeleccionada)
      .then(setFacturas)
      .catch(() => {
        setFacturas([]);
        toast.error('Error al cargar facturas de la campaña');
      })
      .finally(() => setCargandoFacturas(false));
  }, [campaniaSeleccionada]);

  const toggleMes = (mes: number) => {
    setMesesSeleccionados((prev) =>
      prev.includes(mes) ? prev.filter((m) => m !== mes) : [...prev, mes],
    );
  };

  const toggleDia = (dia: number) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const facturasFiltradas = useMemo(() => {
    return facturas.filter((factura) => {
      const { month, day } = getDateParts(factura.fecha_emision);
      if (mesesSeleccionados.length > 0 && !mesesSeleccionados.includes(month)) return false;
      if (diasSeleccionados.length > 0 && !diasSeleccionados.includes(day)) return false;
      return true;
    });
  }, [facturas, mesesSeleccionados, diasSeleccionados]);

  const kpis = useMemo(() => {
    const totalFacturas = facturasFiltradas.length;
    const montoTotal = facturasFiltradas.reduce((sum, f) => sum + parseNumber(f.monto_total), 0);
    const totalEntregables = facturasFiltradas.reduce((sum, f) => sum + parseNumber(f.total_entregables), 0);
    const compradoresUnicos = new Set(facturasFiltradas.map((f) => f.clientes?.cedula).filter(Boolean)).size;
    const conConsentimiento = facturasFiltradas.filter((f) => getConsentimiento(f)?.acepta_proteccion_datos).length;

    return {
      ticketPromedio: totalFacturas > 0 ? montoTotal / totalFacturas : 0,
      compradoresUnicos,
      facturasTotal: totalFacturas,
      canjeTotal: totalEntregables,
      montoTotal,
      conConsentimiento,
    };
  }, [facturasFiltradas]);

  const datosCanjeLocal = useMemo(() => {
    const grupos = facturasFiltradas.reduce((acc, factura) => {
      const local = factura.locales?.nombre ?? 'Sin local';
      acc[local] = (acc[local] ?? 0) + parseNumber(factura.total_entregables);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grupos)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [facturasFiltradas]);

  const datosCanjeCategoria = useMemo(() => {
    const grupos = facturasFiltradas.reduce((acc, factura) => {
      const categoria = factura.locales?.categorias?.nombre ?? 'Sin categoría';
      acc[categoria] = (acc[categoria] ?? 0) + parseNumber(factura.total_entregables);
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(grupos).reduce((sum, value) => sum + value, 0);

    return Object.entries(grupos).map(([nombre, value]) => ({
      nombre,
      value,
      porcentaje: total > 0 ? Number(((value / total) * 100).toFixed(2)) : 0,
    }));
  }, [facturasFiltradas]);

  const datosCanjesDias = useMemo(() => {
    return Array.from({ length: 31 }, (_, index) => {
      const dia = index + 1;
      const total = facturasFiltradas
        .filter((factura) => getDateParts(factura.fecha_emision).day === dia)
        .reduce((sum, factura) => sum + parseNumber(factura.total_entregables), 0);
      return { dia, total };
    });
  }, [facturasFiltradas]);

  const rowsExcel = useMemo(() => {
    return facturasFiltradas.map((factura) => {
      const consentimiento = getConsentimiento(factura);
      const entregablesPorMetodo = factura.factura_metodos_pago
        .map((metodo) => `${metodo.metodos_pago?.nombre ?? 'Sin método'}: ${formatMiles(metodo.entregables_calculados)}`)
        .join(' | ');

      return {
        Campaña: factura.eventos_campanas?.nombre ?? '',
        Local: factura.locales?.nombre ?? '',
        Categoría: factura.locales?.categorias?.nombre ?? '',
        Cliente: getClienteNombre(factura),
        'RUC o cédula': factura.clientes?.cedula ?? '',
        Mail: factura.clientes?.correo ?? '',
        Teléfono: factura.clientes?.telefono ?? '',
        Dirección: factura.clientes?.direccion ?? '',
        Género: factura.clientes?.genero ?? '',
        Factura: factura.numero_factura,
        'Monto factura': formatMiles(factura.monto_total, 2),
        'Fecha emisión': factura.fecha_emision,
        'Fecha creación': formatDate(factura.fecha_registro),
        'Total entregables': formatMiles(factura.total_entregables),
        'Tickets impresos': factura.tickets_impresos ? 'Sí' : 'No',
        'Fecha impresión': formatDate(factura.tickets_impresos_at),
        'Acepta términos y condiciones': consentimiento?.acepta_proteccion_datos ? 'Sí' : 'No',
        'Acepta publicidad': consentimiento?.acepta_publicidad ? 'Sí' : 'No',
        'Fecha aceptación': formatDate(consentimiento?.fecha_aceptacion),
        'Correo consentimiento enviado': formatDate(consentimiento?.correo_enviado_at),
        'Formulario enviado': formatDate(consentimiento?.formulario_enviado_at),
        'Métodos de pago': getMetodosPago(factura),
        Cupones: getCupones(factura),
        'Entregables por método': entregablesPorMetodo,
        Cajero: factura.usuarios?.nombre ?? '',
        'Email cajero': factura.usuarios?.email ?? '',
      };
    });
  }, [facturasFiltradas]);

  const exportarExcel = () => {
    if (rowsExcel.length === 0) {
      toast.error('No hay datos para exportar con los filtros actuales');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rowsExcel);
    worksheet['!cols'] = Object.keys(rowsExcel[0]).map((key) => ({
      wch: Math.max(key.length + 2, 16),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalle facturas');
    XLSX.writeFile(workbook, `reporteria-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel generado correctamente');
  };

  const campaniaActual = eventos.find((evento) => evento.id === campaniaSeleccionada);
  const cargando = cargandoEventos || cargandoFacturas;

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Reportería</h1>
          <p className="mt-2 text-slate-600">Dashboard conectado a facturas reales, clientes, locales y consentimientos.</p>
        </div>
        <Button onClick={exportarExcel} disabled={cargando || rowsExcel.length === 0} className="w-full bg-teal-700 hover:bg-teal-800 lg:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Descargar Excel
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4" />
                Campaña
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={campaniaSeleccionada} onValueChange={setCampaniaSeleccionada} disabled={cargandoEventos}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona campaña" />
                </SelectTrigger>
                <SelectContent>
                  {eventos.map((evento) => (
                    <SelectItem key={evento.id} value={evento.id}>
                      {evento.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {campaniaActual && (
                <p className="text-xs leading-5 text-slate-500">
                  Vigencia: {formatDate(campaniaActual.fecha_inicio)} - {formatDate(campaniaActual.fecha_fin)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Mes de emisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {meses.map((mes) => (
                  <Button
                    key={mes.valor}
                    variant={mesesSeleccionados.includes(mes.valor) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleMes(mes.valor)}
                    className="justify-start text-xs capitalize"
                  >
                    {mes.nombre}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                Día de emisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
                  <Button
                    key={dia}
                    variant={diasSeleccionados.includes(dia) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDia(dia)}
                    className="px-0 text-xs"
                  >
                    {dia}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setMesesSeleccionados([]);
              setDiasSeleccionados([]);
            }}
          >
            Limpiar filtros
          </Button>
        </div>

        <div className="col-span-12 space-y-6 lg:col-span-9">
          {cargando && (
            <Card>
              <CardContent className="flex items-center gap-3 py-6 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando datos reales de reportería...
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="dashboard" className="gap-4">
            <TabsList>
              <TabsTrigger value="dashboard">
                <TrendingUp className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="excel">
                <FileSpreadsheet className="h-4 w-4" />
                Data Excel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Card className="border-teal-200 bg-teal-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Receipt className="h-4 w-4 text-teal-700" />
                      Ticket promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-teal-800">{formatMoney(kpis.ticketPromedio)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <ShoppingCart className="h-4 w-4 text-blue-700" />
                      Compradores únicos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-slate-950">{formatMiles(kpis.compradoresUnicos)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Receipt className="h-4 w-4 text-orange-700" />
                      Facturas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-slate-950">{formatMiles(kpis.facturasTotal)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <Ticket className="h-4 w-4 text-indigo-700" />
                      Canje total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-slate-950">{formatMiles(kpis.canjeTotal)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      Con términos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-slate-950">{formatMiles(kpis.conConsentimiento)}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="h-5 w-5" />
                      Canje por local
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={datosCanjeLocal} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => formatMiles(value)} />
                        <YAxis dataKey="nombre" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatMiles(Number(value))} />
                        <Bar dataKey="total" fill="#0f766e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Canje por categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={datosCanjeCategoria}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ nombre, porcentaje }) => `${nombre} ${formatMiles(Number(porcentaje), 2)}%`}
                          outerRadius={90}
                          dataKey="value"
                        >
                          {datosCanjeCategoria.map((entry, index) => (
                            <Cell key={`${entry.nombre}-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatMiles(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Canje por día de emisión
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={datosCanjesDias}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(value) => formatMiles(value)} />
                      <Tooltip formatter={(value) => formatMiles(Number(value))} />
                      <Legend />
                      <Bar dataKey="total" fill="#0f766e" name="Entregables" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="excel" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Detalle para análisis</CardTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatMiles(rowsExcel.length)} registros listos para descargar según los filtros actuales.
                    </p>
                  </div>
                  <Button onClick={exportarExcel} disabled={cargando || rowsExcel.length === 0} className="bg-teal-700 hover:bg-teal-800">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Excel
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[520px] overflow-auto rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaña</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>RUC/Cédula</TableHead>
                          <TableHead>Mail</TableHead>
                          <TableHead>Teléfono</TableHead>
                          <TableHead>Factura</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Entregables</TableHead>
                          <TableHead>Términos</TableHead>
                          <TableHead>Fecha creación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturasFiltradas.slice(0, 100).map((factura) => {
                          const consentimiento = getConsentimiento(factura);
                          return (
                            <TableRow key={factura.id}>
                              <TableCell>{factura.eventos_campanas?.nombre ?? ''}</TableCell>
                              <TableCell>{factura.locales?.nombre ?? ''}</TableCell>
                              <TableCell>{factura.locales?.categorias?.nombre ?? ''}</TableCell>
                              <TableCell>{getClienteNombre(factura)}</TableCell>
                              <TableCell>{factura.clientes?.cedula ?? ''}</TableCell>
                              <TableCell>{factura.clientes?.correo ?? ''}</TableCell>
                              <TableCell>{factura.clientes?.telefono ?? ''}</TableCell>
                              <TableCell>{factura.numero_factura}</TableCell>
                              <TableCell>{formatMoney(factura.monto_total)}</TableCell>
                              <TableCell>{formatMiles(factura.total_entregables)}</TableCell>
                              <TableCell>{consentimiento?.acepta_proteccion_datos ? 'Sí' : 'No'}</TableCell>
                              <TableCell>{formatDate(factura.fecha_registro)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <Label className="mt-3 block text-xs text-slate-500">
                    La vista muestra hasta 100 filas para mantener la pantalla ágil; el Excel descarga todos los registros filtrados.
                  </Label>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
