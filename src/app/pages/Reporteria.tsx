import { useState, useMemo } from 'react';
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
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, ShoppingCart, Receipt, Ticket, Store, TrendingUp } from 'lucide-react';

// Datos de ejemplo de eventos/campañas activos
const eventosActivos = [
  { 
    id: 1, 
    nombre: 'Campaña Verano 2026', 
    activo: true, 
    cuponId: 1, 
    cuponNombre: 'Dinners triple cupon',
    valorMinimo: 50,
    valorMaximo: 500
  },
  { 
    id: 2, 
    nombre: 'Promoción Navideña', 
    activo: true, 
    cuponId: 6, 
    cuponNombre: 'Cupon especial navidad',
    valorMinimo: 100,
    valorMaximo: 1000
  },
  { 
    id: 3, 
    nombre: 'Evento Aniversario', 
    activo: true, 
    cuponId: 8, 
    cuponNombre: 'Cupon aniversario',
    valorMinimo: 75,
    valorMaximo: 750
  },
];

// Datos de ejemplo de locales comerciales
const localesComerciales = [
  { id: 1, nombre: 'LAND ROVERIA', categoria: 'Retail' },
  { id: 2, nombre: 'AMBACAR', categoria: 'Servicio' },
  { id: 3, nombre: 'BAUER', categoria: 'Retail' },
  { id: 4, nombre: 'BYD', categoria: 'Retail' },
  { id: 5, nombre: 'BYOACCA', categoria: 'HOGAR' },
  { id: 6, nombre: 'PYCCA', categoria: 'HOGAR' },
  { id: 7, nombre: 'PICHINCHA', categoria: 'GASTRONOMIA' },
];

// Categorías disponibles
const categorias = [
  { id: 1, nombre: 'FARMACIA', color: '#10b981' },
  { id: 2, nombre: 'Servicio', color: '#3b82f6' },
  { id: 3, nombre: 'Retail', color: '#06b6d4' },
  { id: 4, nombre: 'GASTRONOMIA', color: '#d946ef' },
  { id: 5, nombre: 'HOGAR', color: '#f97316' },
];

// Facturas de ejemplo (simulando datos)
const facturasEjemplo = [
  // Campaña Verano 2026 - Enero
  { id: 1, eventoId: 1, localId: 1, categoriaId: 3, cedula: '1720345678', monto: 350, entregables: 13, fecha: '2026-01-05', mes: 0, dia: 5 },
  { id: 2, eventoId: 1, localId: 3, categoriaId: 3, cedula: '0923456789', monto: 275, entregables: 11, fecha: '2026-01-08', mes: 0, dia: 8 },
  { id: 3, eventoId: 1, localId: 4, categoriaId: 3, cedula: '1720345678', monto: 420, entregables: 16, fecha: '2026-01-12', mes: 0, dia: 12 },
  { id: 4, eventoId: 1, localId: 2, categoriaId: 2, cedula: '0998765432', monto: 550, entregables: 20, fecha: '2026-01-15', mes: 0, dia: 15 },
  { id: 5, eventoId: 1, localId: 1, categoriaId: 3, cedula: '1715678901', monto: 380, entregables: 14, fecha: '2026-01-18', mes: 0, dia: 18 },
  { id: 6, eventoId: 1, localId: 5, categoriaId: 5, cedula: '0923456789', monto: 290, entregables: 12, fecha: '2026-01-20', mes: 0, dia: 20 },
  { id: 7, eventoId: 1, localId: 6, categoriaId: 5, cedula: '1720345678', monto: 475, entregables: 18, fecha: '2026-01-22', mes: 0, dia: 22 },
  { id: 8, eventoId: 1, localId: 7, categoriaId: 4, cedula: '0912345678', monto: 320, entregables: 13, fecha: '2026-01-25', mes: 0, dia: 25 },
  
  // Promoción Navideña - Diciembre
  { id: 9, eventoId: 2, localId: 1, categoriaId: 3, cedula: '0912345678', monto: 450, entregables: 18, fecha: '2025-12-05', mes: 11, dia: 5 },
  { id: 10, eventoId: 2, localId: 7, categoriaId: 4, cedula: '1708901234', monto: 600, entregables: 42, fecha: '2025-12-10', mes: 11, dia: 10 },
  { id: 11, eventoId: 2, localId: 2, categoriaId: 2, cedula: '1715678901', monto: 800, entregables: 48, fecha: '2025-12-12', mes: 11, dia: 12 },
  { id: 12, eventoId: 2, localId: 5, categoriaId: 5, cedula: '0923456789', monto: 550, entregables: 35, fecha: '2025-12-15', mes: 11, dia: 15 },
  { id: 13, eventoId: 2, localId: 6, categoriaId: 5, cedula: '1720345678', monto: 680, entregables: 40, fecha: '2025-12-18', mes: 11, dia: 18 },
  { id: 14, eventoId: 2, localId: 3, categoriaId: 3, cedula: '0912345678', monto: 720, entregables: 45, fecha: '2025-12-20', mes: 11, dia: 20 },
  { id: 15, eventoId: 2, localId: 4, categoriaId: 3, cedula: '1708901234', monto: 850, entregables: 52, fecha: '2025-12-22', mes: 11, dia: 22 },
  { id: 16, eventoId: 2, localId: 1, categoriaId: 3, cedula: '1715678901', monto: 920, entregables: 58, fecha: '2025-12-25', mes: 11, dia: 25 },
  
  // Evento Aniversario - Febrero
  { id: 17, eventoId: 3, localId: 1, categoriaId: 3, cedula: '1715678901', monto: 525, entregables: 31, fecha: '2026-02-05', mes: 1, dia: 5 },
  { id: 18, eventoId: 3, localId: 2, categoriaId: 2, cedula: '0923456789', monto: 450, entregables: 28, fecha: '2026-02-08', mes: 1, dia: 8 },
  { id: 19, eventoId: 3, localId: 7, categoriaId: 4, cedula: '1720345678', monto: 600, entregables: 36, fecha: '2026-02-12', mes: 1, dia: 12 },
  { id: 20, eventoId: 3, localId: 5, categoriaId: 5, cedula: '0912345678', monto: 375, entregables: 25, fecha: '2026-02-15', mes: 1, dia: 15 },
  { id: 21, eventoId: 3, localId: 6, categoriaId: 5, cedula: '1708901234', monto: 480, entregables: 30, fecha: '2026-02-18', mes: 1, dia: 18 },
  { id: 22, eventoId: 3, localId: 3, categoriaId: 3, cedula: '1715678901', monto: 550, entregables: 33, fecha: '2026-02-20', mes: 1, dia: 20 },
  { id: 23, eventoId: 3, localId: 4, categoriaId: 3, cedula: '0923456789', monto: 625, entregables: 38, fecha: '2026-02-22', mes: 1, dia: 22 },
  { id: 24, eventoId: 3, localId: 1, categoriaId: 3, cedula: '1720345678', monto: 700, entregables: 42, fecha: '2026-02-25', mes: 1, dia: 25 },
];

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

export function Reporteria() {
  const [campaniaSeleccionada, setCampaniaSeleccionada] = useState('2');
  const [mesesSeleccionados, setMesesSeleccionados] = useState<number[]>([11]); // Diciembre por defecto
  const [diasSeleccionados, setDiasSeleccionados] = useState<number[]>([]);

  const toggleMes = (mes: number) => {
    setMesesSeleccionados(prev => 
      prev.includes(mes) ? prev.filter(m => m !== mes) : [...prev, mes]
    );
  };

  const toggleDia = (dia: number) => {
    setDiasSeleccionados(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  // Filtrar facturas según los criterios seleccionados
  const facturasFiltradas = useMemo(() => {
    let filtradas = facturasEjemplo.filter(f => f.eventoId.toString() === campaniaSeleccionada);
    
    if (mesesSeleccionados.length > 0) {
      filtradas = filtradas.filter(f => mesesSeleccionados.includes(f.mes));
    }
    
    if (diasSeleccionados.length > 0) {
      filtradas = filtradas.filter(f => diasSeleccionados.includes(f.dia));
    }
    
    return filtradas;
  }, [campaniaSeleccionada, mesesSeleccionados, diasSeleccionados]);

  // Calcular KPIs
  const kpis = useMemo(() => {
    const totalFacturas = facturasFiltradas.length;
    const montoTotal = facturasFiltradas.reduce((sum, f) => sum + f.monto, 0);
    const totalEntregables = facturasFiltradas.reduce((sum, f) => sum + f.entregables, 0);
    const compradoresUnicos = new Set(facturasFiltradas.map(f => f.cedula)).size;
    const ticketPromedio = totalFacturas > 0 ? montoTotal / totalFacturas : 0;

    return {
      ticketPromedio,
      compradoresUnicos,
      facturasTotal: totalFacturas,
      canjeTotal: totalEntregables,
      montoTotal
    };
  }, [facturasFiltradas]);

  // Datos para gráfico de Canje por Local
  const datosCanjeLocal = useMemo(() => {
    const grupos = facturasFiltradas.reduce((acc, f) => {
      const local = localesComerciales.find(l => l.id === f.localId);
      const nombreLocal = local?.nombre || 'Desconocido';
      if (!acc[nombreLocal]) {
        acc[nombreLocal] = 0;
      }
      acc[nombreLocal] += f.entregables;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grupos)
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total);
  }, [facturasFiltradas]);

  // Datos para gráfico de Canje por Categoría
  const datosCanjeCategoria = useMemo(() => {
    const grupos = facturasFiltradas.reduce((acc, f) => {
      const local = localesComerciales.find(l => l.id === f.localId);
      const categoria = local?.categoria || 'Otros';
      if (!acc[categoria]) {
        acc[categoria] = 0;
      }
      acc[categoria] += f.entregables;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(grupos).reduce((sum, val) => sum + val, 0);

    return Object.entries(grupos).map(([nombre, value]) => ({
      nombre,
      value,
      porcentaje: total > 0 ? ((value / total) * 100).toFixed(2) : '0'
    }));
  }, [facturasFiltradas]);

  // Datos para gráfico de Canje por Días
  const datosCanjesDias = useMemo(() => {
    const diasDelMes = Array.from({ length: 28 }, (_, i) => i + 1);
    
    return diasDelMes.map(dia => {
      const totalDia = facturasFiltradas
        .filter(f => f.dia === dia)
        .reduce((sum, f) => f.entregables, 0);
      
      return {
        dia,
        total: totalDia
      };
    });
  }, [facturasFiltradas]);

  const COLORS = ['#06b6d4', '#3b82f6', '#d946ef', '#f97316', '#10b981', '#eab308'];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl mb-2 text-gray-900">Reportería</h1>
        <p className="text-gray-600">
          Dashboard de análisis de campañas y eventos
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Panel Izquierdo - Filtros */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Selector de Campaña */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Campaña
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={campaniaSeleccionada} onValueChange={setCampaniaSeleccionada}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona campaña" />
                </SelectTrigger>
                <SelectContent>
                  {eventosActivos.map((evento) => (
                    <SelectItem key={evento.id} value={evento.id.toString()}>
                      {evento.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selector de Mes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {meses.slice(0, 6).map((mes) => (
                  <Button
                    key={mes.valor}
                    variant={mesesSeleccionados.includes(mes.valor) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleMes(mes.valor)}
                    className="text-xs"
                  >
                    {mes.nombre}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selector de Día */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Día
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => i + 1).map((dia) => (
                  <Button
                    key={dia}
                    variant={diasSeleccionados.includes(dia) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDia(dia)}
                    className="text-xs"
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
              setMesesSeleccionados([]);
              setDiasSeleccionados([]);
            }}
          >
            Limpiar Filtros
          </Button>
        </div>

        {/* Panel Derecho - Dashboard */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          {/* KPIs - Tarjetas superiores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ticket Promedio */}
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-purple-600" />
                  Ticket Promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {kpis.ticketPromedio.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            {/* Compradores Únicos */}
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  Compradores Únicos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {kpis.compradoresUnicos}
                </div>
              </CardContent>
            </Card>

            {/* Facturas Totales */}
            <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-orange-600" />
                  Facturas Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {kpis.facturasTotal}
                </div>
              </CardContent>
            </Card>

            {/* Canje Total */}
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  Canje Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">
                  {kpis.canjeTotal}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Canje por Local */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Canje por Local
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={datosCanjeLocal} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Canje por Categoría */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Canje por Categoría
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={datosCanjeCategoria}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nombre, porcentaje }) => `${nombre} ${porcentaje}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosCanjeCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Canje por Días */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Canje por Días
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={datosCanjesDias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#8b5cf6" name="Entregables" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
