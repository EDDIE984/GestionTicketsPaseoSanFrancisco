import { useState, useRef, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Calendar as CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

// Interfaz para los datos de tráfico
interface DatoTrafico {
  id: number;
  fecha: string;
  tipo: 'peatonal' | 'vehicular';
  cantidad: number;
  dia: number;
  mes: number;
  year: number;
}

// Generar datos de ejemplo
const generarDatosEjemplo = (): DatoTrafico[] => {
  const datos: DatoTrafico[] = [];
  let id = 1;

  // Datos de Enero a Abril 2025
  for (let mes = 0; mes < 4; mes++) {
    const diasEnMes = mes === 1 ? 28 : 30; // Febrero tiene 28 días
    
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(2025, mes, dia);
      
      // Tráfico Peatonal - varía entre 500 y 2000 personas por día
      const cantidadPeatonal = Math.floor(Math.random() * 1500) + 500;
      datos.push({
        id: id++,
        fecha: fecha.toISOString().split('T')[0],
        tipo: 'peatonal',
        cantidad: cantidadPeatonal,
        dia: dia,
        mes: mes,
        year: 2025,
      });

      // Tráfico Vehicular - varía entre 200 y 800 vehículos por día
      const cantidadVehicular = Math.floor(Math.random() * 600) + 200;
      datos.push({
        id: id++,
        fecha: fecha.toISOString().split('T')[0],
        tipo: 'vehicular',
        cantidad: cantidadVehicular,
        dia: dia,
        mes: mes,
        year: 2025,
      });
    }
  }

  return datos;
};

export function Trafico() {
  const [datosTrafico, setDatosTrafico] = useState<DatoTrafico[]>(generarDatosEjemplo());
  const [fechaInicio, setFechaInicio] = useState('2025-01-01');
  const [fechaFin, setFechaFin] = useState('2025-04-30');
  const [tipoPeatonal, setTipoPeatonal] = useState(true);
  const [tipoVehicular, setTipoVehicular] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState('all');
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const meses = [
    { valor: 'all', nombre: 'Todos' },
    { valor: '0', nombre: 'Enero' },
    { valor: '1', nombre: 'Febrero' },
    { valor: '2', nombre: 'Marzo' },
    { valor: '3', nombre: 'Abril' },
    { valor: '4', nombre: 'Mayo' },
    { valor: '5', nombre: 'Junio' },
    { valor: '6', nombre: 'Julio' },
    { valor: '7', nombre: 'Agosto' },
    { valor: '8', nombre: 'Septiembre' },
    { valor: '9', nombre: 'Octubre' },
    { valor: '10', nombre: 'Noviembre' },
    { valor: '11', nombre: 'Diciembre' },
  ];

  const toggleDia = (dia: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Procesar datos del Excel
        const datosProcesados: DatoTrafico[] = jsonData.map((row: any, index) => {
          const fecha = new Date(row.fecha || row.Fecha || new Date());
          return {
            id: index + 1,
            fecha: fecha.toISOString().split('T')[0],
            tipo: (row.tipo || row.Tipo || 'peatonal').toLowerCase(),
            cantidad: parseInt(row.cantidad || row.Cantidad || 0),
            dia: fecha.getDate(),
            mes: fecha.getMonth(),
            year: fecha.getFullYear(),
          };
        });

        setDatosTrafico(datosProcesados);
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al procesar el archivo Excel. Asegúrate de que tenga las columnas: fecha, tipo, cantidad');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Filtrar datos según los criterios seleccionados
  const datosFiltrados = datosTrafico.filter(dato => {
    // Filtro por tipo
    if (!tipoPeatonal && dato.tipo === 'peatonal') return false;
    if (!tipoVehicular && dato.tipo === 'vehicular') return false;

    // Filtro por mes
    if (mesSeleccionado !== 'all' && dato.mes !== parseInt(mesSeleccionado)) return false;

    // Filtro por días
    if (diasSeleccionados.length > 0 && !diasSeleccionados.includes(dato.dia)) return false;

    // Filtro por rango de fechas
    if (fechaInicio && dato.fecha < fechaInicio) return false;
    if (fechaFin && dato.fecha > fechaFin) return false;

    return true;
  });

  // Calcular total de tráfico
  const totalTrafico = datosFiltrados.reduce((sum, dato) => sum + dato.cantidad, 0);

  // Datos para gráfico de tráfico peatonal mensual
  const datosPeatonalMensual = datosTrafico
    .filter(d => d.tipo === 'peatonal')
    .reduce((acc, dato) => {
      const mes = meses[dato.mes + 1]?.nombre || 'Desconocido';
      const existente = acc.find(item => item.mes === mes);
      if (existente) {
        existente.total += dato.cantidad;
      } else {
        acc.push({ mes, total: dato.cantidad });
      }
      return acc;
    }, [] as { mes: string; total: number }[]);

  // Datos para gráfico de tráfico peatonal diario
  const datosPeatonalDiario = Array.from({ length: 31 }, (_, i) => i + 1).map(dia => {
    const total = datosFiltrados
      .filter(d => d.tipo === 'peatonal' && d.dia === dia)
      .reduce((sum, d) => sum + d.cantidad, 0);
    return { dia, total };
  });

  // Datos para gráfico de tráfico vehicular mensual
  const datosVehicularMensual = datosTrafico
    .filter(d => d.tipo === 'vehicular')
    .reduce((acc, dato) => {
      const mes = meses[dato.mes + 1]?.nombre || 'Desconocido';
      const existente = acc.find(item => item.mes === mes);
      if (existente) {
        existente.total += dato.cantidad;
      } else {
        acc.push({ mes, total: dato.cantidad });
      }
      return acc;
    }, [] as { mes: string; total: number }[]);

  // Datos para gráfico de tráfico vehicular diario
  const datosVehicularDiario = Array.from({ length: 31 }, (_, i) => i + 1).map(dia => {
    const total = datosFiltrados
      .filter(d => d.tipo === 'vehicular' && d.dia === dia)
      .reduce((sum, d) => sum + d.cantidad, 0);
    return { dia, total };
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Encabezado con título y botón de carga */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2 text-gray-900">Tráfico Paseo</h1>
          <p className="text-gray-600">
            Dashboard de análisis de tráfico peatonal y vehicular
          </p>
        </div>
        <div className="flex items-center gap-4">
          {datosTrafico.length > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Tráfico</p>
              <p className="text-2xl font-bold text-purple-600">{totalTrafico.toLocaleString()}</p>
            </div>
          )}
          <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700">
            <Upload className="w-4 h-4 mr-2" />
            Subir Data
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Panel Izquierdo - Filtros */}
        <div className="col-span-12 lg:col-span-2 space-y-4">
          {/* Filtros de Fecha */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Fecha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Desde</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Hasta</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Filtro de Tipo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tipo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="peatonal"
                  checked={tipoPeatonal}
                  onCheckedChange={(checked) => setTipoPeatonal(checked as boolean)}
                />
                <Label htmlFor="peatonal" className="text-sm cursor-pointer">
                  Peatonal
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vehicular"
                  checked={tipoVehicular}
                  onCheckedChange={(checked) => setTipoVehicular(checked as boolean)}
                />
                <Label htmlFor="vehicular" className="text-sm cursor-pointer">
                  Vehicular
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Selector de Mes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.valor} value={mes.valor}>
                      {mes.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selector de Día */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((dia) => (
                  <Button
                    key={dia}
                    variant={diasSeleccionados.includes(dia) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDia(dia)}
                    className="text-xs h-8"
                  >
                    {dia}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Botón para limpiar filtros */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setMesSeleccionado('all');
              setDiasSeleccionados([]);
            }}
          >
            Limpiar Filtros
          </Button>
        </div>

        {/* Panel Derecho - Gráficos */}
        <div className="col-span-12 lg:col-span-10">
          {datosTrafico.length === 0 ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hay datos cargados</h3>
                <p className="text-gray-600 mb-4">
                  Sube un archivo Excel con las columnas: fecha, tipo, cantidad
                </p>
                <Button onClick={() => fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Subir Archivo Excel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tráfico Peatonal Mensual */}
              {tipoPeatonal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tráfico Peatonal Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={datosPeatonalMensual}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tráfico Peatonal Diario */}
              {tipoPeatonal && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tráfico Peatonal Diario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={datosPeatonalDiario}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tráfico Vehicular Mensual */}
              {tipoVehicular && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tráfico Vehicular Mensual</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={datosVehicularMensual}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#7c3aed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Tráfico Vehicular Diario */}
              {tipoVehicular && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tráfico Vehicular Diario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={datosVehicularDiario}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#7c3aed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}