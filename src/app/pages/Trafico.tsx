import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  TraficoIngresoDiario,
  TraficoIngresoUpsert,
  fetchTraficoIngresos,
  upsertTraficoIngresos,
} from '@/lib/api/trafico';

const PLANTILLA_TRAFICO_URL =
  '/plantillas/FO-GOSEGURIDAD%20Y%20TRANSPORTE%20TRAFICO%20INGRESOS%20PEATONAL.xlsx';

const MESES = [
  { valor: 'all', nombre: 'Todos' },
  { valor: '1', nombre: 'Enero' },
  { valor: '2', nombre: 'Febrero' },
  { valor: '3', nombre: 'Marzo' },
  { valor: '4', nombre: 'Abril' },
  { valor: '5', nombre: 'Mayo' },
  { valor: '6', nombre: 'Junio' },
  { valor: '7', nombre: 'Julio' },
  { valor: '8', nombre: 'Agosto' },
  { valor: '9', nombre: 'Septiembre' },
  { valor: '10', nombre: 'Octubre' },
  { valor: '11', nombre: 'Noviembre' },
  { valor: '12', nombre: 'Diciembre' },
];

const MONTH_LOOKUP: Record<string, number> = {
  enero: 1,
  feb: 2,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

function normalizarTexto(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value ?? '').replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateString(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function getMonthFromSheet(sheet: XLSX.WorkSheet, sheetName: string) {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  const candidates: unknown[] = [sheetName];

  for (let row = range.s.r; row <= Math.min(range.e.r, range.s.r + 5); row += 1) {
    for (let col = range.s.c; col <= Math.min(range.e.c, range.s.c + 4); col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.v) candidates.push(cell.v);
    }
  }

  for (const candidate of candidates) {
    const month = MONTH_LOOKUP[normalizarTexto(candidate)];
    if (month) return month;
  }

  throw new Error(`No se pudo identificar el mes en la hoja "${sheetName}".`);
}

function parseTrafficWorkbook(file: File, workbook: XLSX.WorkBook): TraficoIngresoUpsert[] {
  const rows: TraficoIngresoUpsert[] = [];
  const uploadedAt = new Date().toISOString();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
    const mes = getMonthFromSheet(sheet, sheetName);
    let headerRow = -1;
    let yearColumn = -1;
    const dayColumns: Array<{ col: number; dia: number }> = [];

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
        if (normalizarTexto(cell?.v) === 'ano') {
          headerRow = row;
          yearColumn = col;
          break;
        }
      }
      if (headerRow >= 0) break;
    }

    if (headerRow < 0 || yearColumn < 0) {
      throw new Error(`La hoja "${sheetName}" no tiene una fila de encabezado con AÑO.`);
    }

    for (let col = yearColumn + 1; col <= range.e.c; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRow, c: col })];
      const dia = toNumber(cell?.v);
      if (dia && dia >= 1 && dia <= 31) dayColumns.push({ col, dia });
    }

    for (let row = headerRow + 1; row <= range.e.r; row += 1) {
      const anio = toNumber(sheet[XLSX.utils.encode_cell({ r: row, c: yearColumn })]?.v);
      if (!anio || anio < 2000) continue;

      for (const { col, dia } of dayColumns) {
        const fecha = new Date(anio, mes - 1, dia);
        if (fecha.getMonth() !== mes - 1) continue;

        const cantidad = toNumber(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v);
        if (cantidad === null) continue;

        rows.push({
          fecha: toDateString(anio, mes, dia),
          tipo: 'peatonal',
          anio,
          mes,
          dia,
          cantidad: Math.max(0, Math.round(cantidad)),
          fuente_archivo: file.name,
          uploaded_at: uploadedAt,
        });
      }
    }
  }

  return rows;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-EC').format(value);
}

function monthName(month: number) {
  return MESES.find((item) => item.valor === String(month))?.nombre ?? 'Sin mes';
}

const CHART_COLORS = ['#17324d', '#0f766e', '#b45309', '#7c2d12', '#475569', '#6d28d9'];

export function Trafico() {
  const [datosTrafico, setDatosTrafico] = useState<TraficoIngresoDiario[]>([]);
  const [aniosSeleccionados, setAniosSeleccionados] = useState<string[]>([]);
  const [mesesSeleccionados, setMesesSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSeleccion = (
    value: string,
    selected: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const data = await fetchTraficoIngresos();
      setDatosTrafico(data);

      if (data.length > 0) {
        setAniosSeleccionados((prev) => (prev.length === 0 ? [String(data[data.length - 1].anio)] : prev));
        setMesesSeleccionados((prev) => (prev.length === 0 ? [String(data[data.length - 1].mes)] : prev));
      }
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar la data de tráfico. Revisa que la tabla exista en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const rows = parseTrafficWorkbook(file, workbook);

      if (rows.length === 0) {
        toast.warning('La plantilla no contiene valores diarios para importar.');
        return;
      }

      await upsertTraficoIngresos(rows);
      await cargarDatos();
      toast.success(`Se actualizaron ${rows.length} registros de tráfico.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'No se pudo procesar el Excel.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const datosFiltrados = useMemo(() => {
    return datosTrafico.filter((dato) => {
      if (dato.tipo !== 'peatonal') return false;
      if (aniosSeleccionados.length > 0 && !aniosSeleccionados.includes(String(dato.anio))) return false;
      if (mesesSeleccionados.length > 0 && !mesesSeleccionados.includes(String(dato.mes))) return false;
      return true;
    });
  }, [aniosSeleccionados, datosTrafico, mesesSeleccionados]);

  const aniosDisponibles = useMemo(() => {
    return Array.from(new Set(datosTrafico.map((dato) => dato.anio))).sort((a, b) => b - a);
  }, [datosTrafico]);

  const totalTrafico = datosFiltrados.reduce((sum, dato) => sum + dato.cantidad, 0);
  const promedioDiario = datosFiltrados.length > 0 ? Math.round(totalTrafico / datosFiltrados.length) : 0;
  const maximoDia = datosFiltrados.reduce<TraficoIngresoDiario | null>(
    (max, dato) => (!max || dato.cantidad > max.cantidad ? dato : max),
    null,
  );
  const ultimaCarga = datosTrafico
    .map((dato) => dato.uploaded_at)
    .sort()
    .at(-1);

  const datosMensuales = useMemo(() => {
    const byMonth = new Map<string, { periodo: string; total: number; anio: number; mes: number }>();

    for (const dato of datosFiltrados) {
      const key = `${dato.anio}-${dato.mes}`;
      const current = byMonth.get(key) ?? {
        periodo: `${monthName(dato.mes).slice(0, 3)} ${dato.anio}`,
        total: 0,
        anio: dato.anio,
        mes: dato.mes,
      };
      current.total += dato.cantidad;
      byMonth.set(key, current);
    }

    return Array.from(byMonth.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes);
  }, [datosFiltrados]);

  const periodosComparables = useMemo(() => {
    const byPeriod = new Map<string, { key: string; anio: number; mes: number }>();

    for (const dato of datosFiltrados) {
      const key = `${monthName(dato.mes).slice(0, 3)} ${dato.anio}`;
      byPeriod.set(key, { key, anio: dato.anio, mes: dato.mes });
    }

    return Array.from(byPeriod.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes);
  }, [datosFiltrados]);

  const datosDiariosPorPeriodo = useMemo(() => {
    type DiaComparativo = { dia: number } & Record<string, number | null>;
    const byDay = new Map<number, DiaComparativo>();

    for (const dato of datosFiltrados) {
      const current = byDay.get(dato.dia) ?? ({ dia: dato.dia } as DiaComparativo);
      current[`${monthName(dato.mes).slice(0, 3)} ${dato.anio}`] = dato.cantidad;
      byDay.set(dato.dia, current);
    }

    return Array.from(byDay.values()).sort((a, b) => a.dia - b.dia);
  }, [datosFiltrados]);

  const ultimosRegistros = useMemo(() => {
    return [...datosTrafico].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 8);
  }, [datosTrafico]);

  return (
    <div className="min-h-screen bg-[#f6f4ef] p-4 text-[#1f2933] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="border-l-4 border-[#0f766e] bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm text-[#667085]">
              <FileSpreadsheet className="h-4 w-4 text-[#0f766e]" />
              Gestión de tráfico
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[#101828]">
              Tráfico Paseo San Francisco
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
              Descarga la plantilla oficial, actualiza los valores diarios por mes y año, y vuelve a subirla para sincronizar el dashboard con Supabase.
            </p>
          </div>

          <Card className="rounded-md border-[#d8d3c7] bg-[#17324d] text-white shadow-sm">
            <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
              <div>
                <p className="text-sm text-white/70">Total filtrado</p>
                <p className="mt-1 text-4xl font-semibold">{formatNumber(totalTrafico)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-white/60">Promedio diario</p>
                  <p className="text-lg font-medium">{formatNumber(promedioDiario)}</p>
                </div>
                <div>
                  <p className="text-white/60">Mejor día</p>
                  <p className="text-lg font-medium">
                    {maximoDia ? `${maximoDia.dia} ${monthName(maximoDia.mes).slice(0, 3)}` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card className="rounded-md border-[#d8d3c7] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4 text-[#0f766e]" />
                  Actualizar datos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="h-11 w-full justify-start rounded-md">
                  <a href={PLANTILLA_TRAFICO_URL} download>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar plantilla Excel
                  </a>
                </Button>
                <Button
                  className="h-11 w-full justify-start rounded-md bg-[#0f766e] hover:bg-[#115e59]"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  Subir plantilla actualizada
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <p className="text-xs leading-5 text-[#667085]">
                  La importación actualiza cada fecha peatonal. Si un día ya existe, se reemplaza por el nuevo valor del Excel.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-md border-[#d8d3c7] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-[#0f766e]" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Años</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md px-2 text-xs"
                      onClick={() => setAniosSeleccionados([])}
                    >
                      Todos
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {aniosDisponibles.map((anio) => {
                      const value = String(anio);
                      return (
                        <label
                          key={anio}
                          className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#d8d3c7] px-3 text-sm"
                        >
                          <Checkbox
                            checked={aniosSeleccionados.includes(value)}
                            onCheckedChange={() => toggleSeleccion(value, aniosSeleccionados, setAniosSeleccionados)}
                          />
                          {anio}
                        </label>
                      );
                    })}
                  </div>
                  {aniosSeleccionados.length === 0 && (
                    <p className="text-xs text-[#667085]">Sin años marcados equivale a todos.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Meses</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-md px-2 text-xs"
                      onClick={() => setMesesSeleccionados([])}
                    >
                      Todos
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {MESES.filter((mes) => mes.valor !== 'all').map((mes) => (
                      <label
                        key={mes.valor}
                        className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#d8d3c7] px-3 text-sm"
                      >
                        <Checkbox
                          checked={mesesSeleccionados.includes(mes.valor)}
                          onCheckedChange={() => toggleSeleccion(mes.valor, mesesSeleccionados, setMesesSeleccionados)}
                        />
                        {mes.nombre}
                      </label>
                    ))}
                  </div>
                  {mesesSeleccionados.length === 0 && (
                    <p className="text-xs text-[#667085]">Sin meses marcados equivale a todos.</p>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="h-10 w-full rounded-md"
                  onClick={() => {
                    setAniosSeleccionados([]);
                    setMesesSeleccionados([]);
                  }}
                >
                  Limpiar filtros
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#667085]">Registros</p>
                  <p className="mt-2 text-2xl font-semibold">{formatNumber(datosFiltrados.length)}</p>
                </CardContent>
              </Card>
              <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#667085]">Rango disponible</p>
                  <p className="mt-2 text-lg font-semibold">
                    {datosTrafico[0]?.fecha ?? '-'} / {datosTrafico.at(-1)?.fecha ?? '-'}
                  </p>
                </CardContent>
              </Card>
              <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-[#667085]">Última carga</p>
                  <p className="mt-2 text-lg font-semibold">
                    {ultimaCarga ? new Date(ultimaCarga).toLocaleDateString('es-EC') : '-'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {loading ? (
              <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                <CardContent className="flex min-h-[360px] items-center justify-center">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#0f766e]" />
                  Cargando tráfico...
                </CardContent>
              </Card>
            ) : datosTrafico.length === 0 ? (
              <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                  <FileSpreadsheet className="mb-4 h-12 w-12 text-[#0f766e]" />
                  <h2 className="text-xl font-semibold">Sin datos de tráfico</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#667085]">
                    Ejecuta el SQL de la tabla en Supabase y sube la plantilla Excel para iniciar el dashboard.
                  </p>
                  <Button className="mt-5 rounded-md bg-[#0f766e] hover:bg-[#115e59]" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir plantilla
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-md border-[#d8d3c7] shadow-sm xl:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base">Total por periodo</CardTitle>
                    <Button variant="ghost" size="sm" className="rounded-md" onClick={cargarDatos}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Recargar
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={290}>
                      <BarChart data={datosMensuales}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => formatNumber(Number(value))} />
                        <Tooltip formatter={(value) => formatNumber(Number(value))} />
                        <Legend />
                        <Bar dataKey="total" name="Ingresos" fill="#0f766e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Comparativo diario por periodo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {periodosComparables.length === 0 ? (
                      <div className="flex h-[260px] items-center justify-center text-center text-sm leading-6 text-[#667085]">
                        No hay periodos con datos para la selección actual.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={datosDiariosPorPeriodo}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4dfd3" />
                          <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                          <YAxis tickFormatter={(value) => formatNumber(Number(value))} />
                          <Tooltip formatter={(value) => formatNumber(Number(value))} />
                          <Legend />
                          {periodosComparables.map((periodo, index) => (
                            <Line
                              key={periodo.key}
                              type="monotone"
                              dataKey={periodo.key}
                              name={periodo.key}
                              stroke={CHART_COLORS[index % CHART_COLORS.length]}
                              strokeWidth={3}
                              dot={{ r: 3 }}
                              connectNulls={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-md border-[#d8d3c7] shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarIcon className="h-4 w-4 text-[#0f766e]" />
                      Últimos registros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ultimosRegistros.map((dato) => (
                          <TableRow key={dato.id}>
                            <TableCell>{dato.fecha}</TableCell>
                            <TableCell className="text-right font-medium">{formatNumber(dato.cantidad)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
