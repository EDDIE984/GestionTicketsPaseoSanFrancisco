import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, X, Printer, PlusCircle, FileStack } from 'lucide-react';
import { useAuth } from '@/app/components/AuthContext';

interface MetodoPago {
  id: number;
  nombre: string;
  monto: number;
  cuponId?: number;
  cuponNombre?: string;
  cuponNumero?: number;
  entregablesCalculados?: number;
}

interface Factura {
  id: number;
  eventoNombre: string;
  eventoId: number;
  eventoCuponId?: number;
  eventoCuponNombre?: string;
  eventoValorMinimo: number;
  cedula: string;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string; // Agregamos teléfono
  correo: string;
  genero: string;
  numeroFactura: string;
  montoTotal: number;
  fechaEmision: string;
  metodosPago: MetodoPago[];
  totalEntregables: number;
  fechaRegistro: string;
  timestampRegistro: number; // Agregamos timestamp para comparaciones confiables
  usuarioRegistro?: string; // Nuevo: email del usuario que registra
  localId?: number;
  localNombre?: string;
}

interface SaldoCliente {
  cedula: string;
  nombre: string;
  apellido: string;
  totalEntregables: number;
  entregablesEntregados: number;
  saldoPendiente: number;
  ultimaActualizacion: string;
}

// Datos de cupones con su número multiplicador
const cuponesDisponibles = [
  { id: 1, nombre: 'Dinners triple cupon', numero: 3, activo: true },
  { id: 2, nombre: 'Cupon doble descuento', numero: 2, activo: true },
  { id: 3, nombre: 'Mega cupon premium', numero: 5, activo: true },
  { id: 4, nombre: 'Cupon simple', numero: 1, activo: true },
  { id: 5, nombre: 'Cupon familiar', numero: 4, activo: true },
  { id: 6, nombre: 'Cupon especial navidad', numero: 10, activo: false },
  { id: 7, nombre: 'Cupon fin de semana', numero: 2, activo: true },
  { id: 8, nombre: 'Cupon aniversario', numero: 7, activo: true },
];

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

// Datos de locales comerciales activos (simulación, normalmente vendría de un contexto global o API)
const localesDisponibles = [
  { id: 1, nombre: '3500 Restaurante', activo: true },
  { id: 2, nombre: 'AutoMax', activo: true },
  { id: 3, nombre: 'Banco Nacional', activo: true },
  { id: 4, nombre: 'Farmacia Salud', activo: true },
  { id: 5, nombre: 'Ferretería El Constructor', activo: true },
  { id: 6, nombre: 'Moda y Estilo', activo: true },
  { id: 7, nombre: 'SuperMercado Familiar', activo: true },
  { id: 8, nombre: 'Tienda Retail Plus', activo: true },
];

// Datos de métodos de pago disponibles
const metodosPagoDisponibles = [
  { id: 1, nombre: 'Efectivo' },
  { id: 2, nombre: 'Tarjeta de Crédito' },
  { id: 3, nombre: 'Tarjeta de Débito' },
  { id: 4, nombre: 'Transferencia' },
  { id: 5, nombre: 'Cheque' },
];

export function Registro() {
  const { user } = useAuth();
  // Facturas ya registradas (persistentes en memoria)
  const [facturas, setFacturas] = useState<Factura[]>([
    // Factura 1 - Campaña Verano 2026
    {
      id: 1737100800000,
      eventoNombre: 'Campaña Verano 2026',
      eventoId: 1,
      eventoCuponId: 1,
      eventoCuponNombre: 'Dinners triple cupon',
      eventoValorMinimo: 50,
      cedula: '1720345678',
      nombre: 'María',
      apellido: 'González Pérez',
      direccion: 'Av. Amazonas N23-45 y Wilson',
      telefono: '0991234567',
      correo: 'maria.gonzalez@email.com',
      genero: 'femenino',
      numeroFactura: '001-001-0000123',
      montoTotal: 350.00,
      fechaEmision: '2026-01-17',
      metodosPago: [
        {
          id: 1,
          nombre: 'Efectivo',
          monto: 200.00,
          entregablesCalculados: 4
        },
        {
          id: 2,
          nombre: 'Tarjeta de Crédito',
          monto: 150.00,
          cuponId: 1,
          cuponNombre: 'Dinners triple cupon',
          cuponNumero: 3,
          entregablesCalculados: 9
        }
      ],
      totalEntregables: 13,
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now() - 3600000
    },
    // Factura 2 - Promoción Navideña
    {
      id: 1737104400000,
      eventoNombre: 'Promoción Navideña',
      eventoId: 2,
      eventoCuponId: 6,
      eventoCuponNombre: 'Cupon especial navidad',
      eventoValorMinimo: 100,
      cedula: '0912345678',
      nombre: 'Carlos',
      apellido: 'Ramírez Silva',
      direccion: 'Calle García Moreno 512 y Sucre',
      telefono: '0987654321',
      correo: 'carlos.ramirez@email.com',
      genero: 'masculino',
      numeroFactura: '001-001-0000124',
      montoTotal: 450.00,
      fechaEmision: '2026-01-17',
      metodosPago: [
        {
          id: 2,
          nombre: 'Tarjeta de Crédito',
          monto: 300.00,
          entregablesCalculados: 3
        },
        {
          id: 4,
          nombre: 'Transferencia',
          monto: 150.00,
          cuponId: 6,
          cuponNombre: 'Cupon especial navidad',
          cuponNumero: 10,
          entregablesCalculados: 15
        }
      ],
      totalEntregables: 18,
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now() - 7200000
    },
    // Factura 3 - Evento Aniversario
    {
      id: 1737108000000,
      eventoNombre: 'Evento Aniversario',
      eventoId: 3,
      eventoCuponId: 8,
      eventoCuponNombre: 'Cupon aniversario',
      eventoValorMinimo: 75,
      cedula: '1715678901',
      nombre: 'Andrea',
      apellido: 'Morales Vega',
      direccion: 'Av. 6 de Diciembre N34-120 y Bosmediano',
      telefono: '0998765432',
      correo: 'andrea.morales@email.com',
      genero: 'femenino',
      numeroFactura: '001-001-0000125',
      montoTotal: 525.00,
      fechaEmision: '2026-01-17',
      metodosPago: [
        {
          id: 1,
          nombre: 'Efectivo',
          monto: 225.00,
          entregablesCalculados: 3
        },
        {
          id: 3,
          nombre: 'Tarjeta de Débito',
          monto: 300.00,
          cuponId: 8,
          cuponNombre: 'Cupon aniversario',
          cuponNumero: 7,
          entregablesCalculados: 28
        }
      ],
      totalEntregables: 31,
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now() - 1800000
    },
    // Factura 4 - Campaña Verano 2026
    {
      id: 1737111600000,
      eventoNombre: 'Campaña Verano 2026',
      eventoId: 1,
      eventoCuponId: 1,
      eventoCuponNombre: 'Dinners triple cupon',
      eventoValorMinimo: 50,
      cedula: '0923456789',
      nombre: 'Jorge',
      apellido: 'Medina Castro',
      direccion: 'Av. Mariscal Sucre S28-15 y Machala',
      telefono: '0993456789',
      correo: 'jorge.medina@email.com',
      genero: 'masculino',
      numeroFactura: '001-001-0000126',
      montoTotal: 275.00,
      fechaEmision: '2026-01-17',
      metodosPago: [
        {
          id: 1,
          nombre: 'Efectivo',
          monto: 125.00,
          entregablesCalculados: 2
        },
        {
          id: 2,
          nombre: 'Tarjeta de Crédito',
          monto: 150.00,
          cuponId: 1,
          cuponNombre: 'Dinners triple cupon',
          cuponNumero: 3,
          entregablesCalculados: 9
        }
      ],
      totalEntregables: 11,
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now() - 900000
    },
    // Factura 5 - Promoción Navideña
    {
      id: 1737115200000,
      eventoNombre: 'Promoción Navideña',
      eventoId: 2,
      eventoCuponId: 6,
      eventoCuponNombre: 'Cupon especial navidad',
      eventoValorMinimo: 100,
      cedula: '1708901234',
      nombre: 'Sofía',
      apellido: 'Ruiz Alvarado',
      direccion: 'Calle Imbabura 234 y Pichincha',
      telefono: '0996543210',
      correo: 'sofia.ruiz@email.com',
      genero: 'femenino',
      numeroFactura: '001-001-0000127',
      montoTotal: 600.00,
      fechaEmision: '2026-01-17',
      metodosPago: [
        {
          id: 1,
          nombre: 'Efectivo',
          monto: 200.00,
          entregablesCalculados: 2
        },
        {
          id: 2,
          nombre: 'Tarjeta de Crédito',
          monto: 400.00,
          cuponId: 6,
          cuponNombre: 'Cupon especial navidad',
          cuponNumero: 10,
          entregablesCalculados: 40
        }
      ],
      totalEntregables: 42,
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now() - 300000
    }
  ]);
  // Estado del cliente (persistente mientras se agregan facturas)
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [genero, setGenero] = useState('');
  // Estado de la factura actual
  const [localId, setLocalId] = useState('');
  const [eventoId, setEventoId] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [montoTotal, setMontoTotal] = useState('');
  // Fecha actual en formato yyyy-mm-dd
  const getFechaActual = () => {
    const d = new Date();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };
  const [fechaEmision, setFechaEmision] = useState(getFechaActual());
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('');
  const [montoMetodo, setMontoMetodo] = useState('');
  const [cuponSeleccionado, setCuponSeleccionado] = useState('');
  const [error, setError] = useState('');
  // Facturas pendientes por registrar (en memoria temporal)
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([]);
  const [mostrarDialogoTickets, setMostrarDialogoTickets] = useState(false);
  const [facturasActuales, setFacturasActuales] = useState<Factura[]>([]);

  const calcularTotalMetodos = () => {
    return metodosPago.reduce((sum, m) => sum + m.monto, 0);
  };

  const agregarMetodoPago = () => {
    if (!metodoSeleccionado || !montoMetodo) {
      toast.error('Selecciona un método de pago y especifica el monto');
      setError('');
      return;
    }
    if (!eventoId) {
      toast.error('Debes seleccionar un evento primero');
      setError('');
      return;
    }
    const monto = parseFloat(montoMetodo);
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      setError('');
      return;
    }
    const totalActual = calcularTotalMetodos();
    const montoTotalNum = parseFloat(montoTotal);
    if (totalActual + monto > montoTotalNum) {
      toast.error('El total de los métodos de pago excede el monto de la factura');
      setError('');
      return;
    }

    const metodoNombre = metodosPagoDisponibles.find(
      (m) => m.id.toString() === metodoSeleccionado
    )?.nombre || '';

    // Obtener datos del evento
    const evento = eventosActivos.find((e) => e.id.toString() === eventoId);
    const valorMinimo = evento?.valorMinimo || 1;

    // Obtener número del cupón (multiplicador)
    let cuponNumero = 1; // Por defecto sin cupón = multiplicador 1
    let cuponNombre = undefined;
    let cuponId = undefined;

    // Solo si hay un cupón seleccionado Y no es "none"
    if (cuponSeleccionado && cuponSeleccionado !== 'none' && cuponSeleccionado !== '') {
      const cupon = cuponesDisponibles.find((c) => c.id.toString() === cuponSeleccionado);
      if (cupon) {
        cuponNumero = cupon.numero;
        cuponNombre = cupon.nombre;
        cuponId = cupon.id;
      }
    }

    // Calcular entregables: Math.floor(monto_método / valor_mínimo_campaña) × multiplicador_cupón
    const entregablesBase = Math.floor(monto / valorMinimo);
    const entregablesCalculados = entregablesBase * cuponNumero;

    console.log('DEBUG Cálculo:', {
      monto,
      valorMinimo,
      cuponNumero,
      entregablesBase,
      entregablesCalculados
    });

    setMetodosPago([
      ...metodosPago,
      {
        id: parseInt(metodoSeleccionado),
        nombre: metodoNombre,
        monto: monto,
        cuponId: cuponId,
        cuponNombre: cuponNombre,
        cuponNumero: cuponNumero,
        entregablesCalculados: entregablesCalculados,
      },
    ]);

    setMetodoSeleccionado('');
    setMontoMetodo('');
    setCuponSeleccionado('');
    setError('');
  };

  const eliminarMetodoPago = (index: number) => {
    setMetodosPago(metodosPago.filter((_, i) => i !== index));
  };

  // Limpiar solo los campos de factura y métodos de pago (eventoId NO se limpia)
  const limpiarFactura = () => {
    setNumeroFactura('');
    setMontoTotal('');
    setFechaEmision(getFechaActual());
    setMetodosPago([]);
    setMetodoSeleccionado('');
    setMontoMetodo('');
    setCuponSeleccionado('');
    setError('');
  };

  // Limpiar todo (cliente, evento y factura)
  const limpiarCliente = () => {
    setCedula('');
    setNombre('');
    setApellido('');
    setDireccion('');
    setTelefono('');
    setCorreo('');
    setGenero('');
    setEventoId('');
    limpiarFactura();
  };

  // Agregar factura a la lista temporal
  const agregarFacturaPendiente = () => {
    // Validar campos vacíos
    const campos = [eventoId, localId, cedula, nombre, apellido, direccion, telefono, correo, genero, numeroFactura, montoTotal, fechaEmision];
    if (campos.some((c) => !c || c.trim() === '')) {
      toast.error('Todos los campos son obligatorios');
      setError('');
      return;
    }
    if (metodosPago.length === 0) {
      toast.error('Debe agregar al menos un método de pago');
      setError('');
      return;
    }
    const totalMetodos = calcularTotalMetodos();
    const montoTotalNum = parseFloat(montoTotal);
    if (totalMetodos !== montoTotalNum) {
      toast.error(`El total de los métodos de pago ($${totalMetodos.toFixed(2)}) debe ser igual al monto total de la factura ($${montoTotalNum.toFixed(2)})`);
      setError('');
      return;
    }
    const eventoNombre = eventosActivos.find((e) => e.id.toString() === eventoId)?.nombre || '';
    const eventoCuponId = eventosActivos.find((e) => e.id.toString() === eventoId)?.cuponId;
    const eventoCuponNombre = eventosActivos.find((e) => e.id.toString() === eventoId)?.cuponNombre;
    const eventoValorMinimo = eventosActivos.find((e) => e.id.toString() === eventoId)?.valorMinimo || 0;
    const localNombre = localesDisponibles.find((l) => l.id.toString() === localId)?.nombre || '';
    const nuevaFactura: Factura = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      eventoNombre,
      localId: parseInt(localId),
      localNombre,
      eventoId: parseInt(eventoId),
      eventoCuponId,
      eventoCuponNombre,
      eventoValorMinimo,
      cedula,
      nombre,
      apellido,
      direccion,
      telefono,
      correo,
      genero,
      numeroFactura,
      montoTotal: montoTotalNum,
      fechaEmision,
      metodosPago: [...metodosPago],
      totalEntregables: metodosPago.reduce((sum, m) => sum + (m.entregablesCalculados || 0), 0),
      fechaRegistro: new Date().toLocaleString(),
      timestampRegistro: Date.now(),
      usuarioRegistro: user ? user.email : 'anonimo',
    };
    setFacturasPendientes([nuevaFactura, ...facturasPendientes]);
    limpiarFactura();
    setError('');
  };

  // Registrar todas las facturas pendientes
  const registrarFacturas = () => {
    if (facturasPendientes.length === 0) {
      toast.error('No hay facturas pendientes por registrar');
      setError('');
      return;
    }
    setFacturas([...facturasPendientes, ...facturas]);
    setFacturasActuales(facturasPendientes);
    setFacturasPendientes([]);
    setError('');
    setMostrarDialogoTickets(true);
    limpiarCliente(); // Limpiar todo después de registrar/imprimir
  };

  // Función para ocultar cédula parcialmente (muestra últimos 3 dígitos)
  const ocultarCedula = (cedula: string) => {
    if (cedula.length <= 3) return cedula;
    const visible = cedula.slice(-3);
    const oculto = 'X'.repeat(cedula.length - 3);
    return oculto + visible;
  };

  // Función para generar número de ticket único
  const generarNumeroTicket = (facturaId: number, indice: number) => {
    const base = facturaId % 10000; // Tomar los últimos 4 dígitos del ID
    return base + indice;
  };

  // Función para imprimir tickets
  const imprimirTickets = () => {
    window.print();
  };

  // Filtrar facturas del día usando timestamp para evitar problemas de parseo
  const facturasDelDia = facturas.filter((f) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Inicio del día de hoy
    const finDia = new Date();
    finDia.setHours(23, 59, 59, 999); // Fin del día de hoy
    
    return f.timestampRegistro >= hoy.getTime() && f.timestampRegistro <= finDia.getTime();
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Registro de Facturas</h1>
        <p className="text-gray-600">Registra facturas de eventos y campañas</p>
      </div>

      <Tabs defaultValue="registro" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="facturas">Facturas del Día ({facturasDelDia.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nueva Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">


              <div>
                <Label htmlFor="evento">Evento/Campaña *</Label>
                <Select value={eventoId} onValueChange={setEventoId}>
                  <SelectTrigger id="evento">
                    <SelectValue placeholder="Selecciona un evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventosActivos.map((evento) => (
                      <SelectItem key={evento.id} value={evento.id.toString()}>
                        {evento.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cedula">Cédula *</Label>
                  <Input
                    id="cedula"
                    value={cedula}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCedula(e.target.value)}
                    placeholder="Número de cédula"
                  />
                </div>

                <div>
                  <Label htmlFor="genero">Género *</Label>
                  <Select value={genero} onValueChange={setGenero}>
                    <SelectTrigger id="genero">
                      <SelectValue placeholder="Selecciona género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNombre(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={apellido}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApellido(e.target.value)}
                    placeholder="Apellidos"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="direccion">Dirección *</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDireccion(e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTelefono(e.target.value)}
                  placeholder="0999999999"
                />
              </div>

              <div>
                <Label htmlFor="correo">Correo Electrónico *</Label>
                <Input
                  id="correo"
                  type="email"
                  value={correo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Información de la Factura</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="localComercial">Local Comercial *</Label>
                    <Select value={localId} onValueChange={setLocalId}>
                      <SelectTrigger id="localComercial">
                        <SelectValue placeholder="Selecciona un local" />
                      </SelectTrigger>
                      <SelectContent>
                        {localesDisponibles.filter(l => l.activo).map((local) => (
                          <SelectItem key={local.id} value={local.id.toString()}>
                            {local.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="numeroFactura">Número de Factura *</Label>
                    <Input
                      id="numeroFactura"
                      value={numeroFactura}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumeroFactura(e.target.value)}
                      placeholder="001-001-0000001"
                    />
                  </div>

                  <div>
                    <Label htmlFor="montoTotal">Monto Total *</Label>
                    <Input
                      id="montoTotal"
                      type="number"
                      step="0.01"
                      value={montoTotal}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMontoTotal(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="fechaEmision">Fecha de Emisión *</Label>
                    <Input
                      id="fechaEmision"
                      type="date"
                      value={fechaEmision}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaEmision(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Métodos de Pago</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="metodoPago">Método de Pago</Label>
                    <Select value={metodoSeleccionado} onValueChange={setMetodoSeleccionado}>
                      <SelectTrigger id="metodoPago">
                        <SelectValue placeholder="Selecciona método" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodosPagoDisponibles.map((metodo) => (
                          <SelectItem key={metodo.id} value={metodo.id.toString()}>
                            {metodo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="montoMetodo">Monto</Label>
                    <Input
                      id="montoMetodo"
                      type="number"
                      step="0.01"
                      value={montoMetodo}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMontoMetodo(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cuponMetodo">Cupón (Opcional)</Label>
                    <Select 
                      value={cuponSeleccionado} 
                      onValueChange={setCuponSeleccionado}
                      disabled={!eventoId}
                    >
                      <SelectTrigger id="cuponMetodo">
                        <SelectValue placeholder={eventoId ? "Selecciona cupón" : "Selecciona evento primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cupón</SelectItem>
                        {eventoId && eventosActivos
                          .filter((e) => e.id.toString() === eventoId)
                          .map((evento) => (
                            <SelectItem key={evento.cuponId} value={evento.cuponId.toString()}>
                              {evento.cuponNombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={agregarMetodoPago} type="button" className="w-full">
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Método
                    </Button>
                  </div>
                </div>

                {metodosPago.length > 0 && (
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="space-y-2">
                      {metodosPago.map((metodo, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white p-3 rounded border"
                        >
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="font-medium">{metodo.nombre}</span>
                            <span className="text-gray-600">${metodo.monto.toFixed(2)}</span>
                            {metodo.cuponNombre && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {metodo.cuponNombre} (x{metodo.cuponNumero})
                              </Badge>
                            )}
                            <Badge variant="default" className="bg-green-600">
                              {metodo.entregablesCalculados} {metodo.entregablesCalculados === 1 ? 'entregable' : 'entregables'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => eliminarMetodoPago(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Métodos de Pago:</span>
                        <span className={`text-lg font-bold ${calcularTotalMetodos() === parseFloat(montoTotal || '0') ? 'text-green-600' : 'text-red-600'}`}>
                          ${calcularTotalMetodos().toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Entregables:</span>
                        <span className="text-lg font-bold text-green-600">
                          {metodosPago.reduce((sum, m) => sum + (m.entregablesCalculados || 0), 0)}
                        </span>
                      </div>
                    </div>
                    {montoTotal && calcularTotalMetodos() === parseFloat(montoTotal) && (
                      <div className="mt-2 flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>El total coincide con el monto de la factura</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tabla de facturas pendientes por registrar */}
              {facturasPendientes.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Facturas pendientes por registrar</h3>
                  <div className="overflow-x-auto mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Evento</TableHead>
                          <TableHead>Cédula</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>No. Factura</TableHead>
                          <TableHead>Monto Total</TableHead>
                          <TableHead>Total Entregables</TableHead>
                          <TableHead>Fecha Emisión</TableHead>
                          <TableHead>Métodos de Pago</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facturasPendientes.map((factura) => (
                          <TableRow key={factura.id}>
                            <TableCell>{factura.eventoNombre}</TableCell>
                            <TableCell>{factura.cedula}</TableCell>
                            <TableCell>{factura.nombre} {factura.apellido}</TableCell>
                            <TableCell>{factura.numeroFactura}</TableCell>
                            <TableCell>${factura.montoTotal.toFixed(2)}</TableCell>
                            <TableCell>{factura.totalEntregables}</TableCell>
                            <TableCell>{factura.fechaEmision}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {factura.metodosPago.map((metodo, idx) => (
                                  <div key={idx} className="text-xs">
                                    <span className="font-medium">{metodo.nombre}:</span> ${metodo.monto.toFixed(2)}
                                    {metodo.cuponNombre && (
                                      <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                        {metodo.cuponNombre} (x{metodo.cuponNumero})
                                      </span>
                                    )}
                                    <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                      {metodo.entregablesCalculados} entregables
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button onClick={agregarFacturaPendiente}>
                  <PlusCircle className="w-5 h-5 mr-2" />
                  Factura
                </Button>
                <Button onClick={registrarFacturas} variant="default" disabled={facturasPendientes.length === 0}>
                  <FileStack className="w-5 h-5 mr-2" />
                  Registrar facturas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Registradas Hoy</CardTitle>
              <CardDescription>
                Lista de todas las facturas registradas en el día actual
              </CardDescription>
            </CardHeader>
            <CardContent>
              {facturasDelDia.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No hay facturas registradas hoy</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Cédula</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Género</TableHead>
                        <TableHead>No. Factura</TableHead>
                        <TableHead>Monto Total</TableHead>
                        <TableHead>Total Entregables</TableHead>
                        <TableHead>Fecha Emisión</TableHead>
                        <TableHead>Métodos de Pago</TableHead>
                        <TableHead>Hora Registro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasDelDia.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell className="font-medium">{factura.eventoNombre}</TableCell>
                          <TableCell>{factura.cedula}</TableCell>
                          <TableCell>
                            {factura.nombre} {factura.apellido}
                          </TableCell>
                          <TableCell>
                            <Badge variant={factura.genero === 'masculino' ? 'default' : 'secondary'}>
                              {factura.genero}
                            </Badge>
                          </TableCell>
                          <TableCell>{factura.numeroFactura}</TableCell>
                          <TableCell className="font-semibold">
                            ${factura.montoTotal.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              {factura.totalEntregables}
                            </Badge>
                          </TableCell>
                          <TableCell>{factura.fechaEmision}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {factura.metodosPago.map((metodo, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{metodo.nombre}:</span> ${metodo.monto.toFixed(2)}
                                  {metodo.cuponNombre && (
                                    <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                      {metodo.cuponNombre} (x{metodo.cuponNumero})
                                    </span>
                                  )}
                                  <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                    {metodo.entregablesCalculados} entregables
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {factura.fechaRegistro}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Tickets */}
      <Dialog open={mostrarDialogoTickets} onOpenChange={setMostrarDialogoTickets}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              Tickets Generados - Total: {facturasActuales.reduce((acc, f) => acc + f.totalEntregables, 0)}
            </DialogTitle>
            <DialogDescription>
              Visualiza e imprime los tickets para entregar al cliente
            </DialogDescription>
          </DialogHeader>

          {facturasActuales.length > 0 && (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-10">
                  {facturasActuales.map((facturaActual, idxFactura) => (
                    <div key={facturaActual.id}>
                      <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                        <h3 className="font-semibold mb-3">Resumen de Factura</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Evento:</span>
                            <p className="font-medium">{facturaActual.eventoNombre}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Cliente:</span>
                            <p className="font-medium">{facturaActual.nombre} {facturaActual.apellido}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">No. Factura:</span>
                            <p className="font-medium">{facturaActual.numeroFactura}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Monto Total:</span>
                            <p className="font-medium">${facturaActual.montoTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-4">Tickets de Entrega</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Array.from({ length: facturaActual.totalEntregables }).map((_, index) => {
                            const numeroTicket = generarNumeroTicket(facturaActual.id, index);
                            const [year, month, day] = facturaActual.fechaEmision.split('-');
                            const fechaFormato = `${day}/${month}/${year}`;
                            const horaActual = new Date();
                            const horaFormato = horaActual.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                            return (
                              <div
                                key={index}
                                className="border-2 border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow print:break-inside-avoid"
                              >
                                <div className="text-center mb-3 border-b pb-3">
                                  <h2 className="text-base font-bold mb-1 text-gray-700 uppercase leading-tight">
                                    {facturaActual.eventoNombre}
                                  </h2>
                                  <p className="text-xs text-gray-500">Ticket de Entrega</p>
                                </div>
                                <div className="text-center mb-3 bg-gray-50 rounded py-2">
                                  <p className="text-xs text-gray-600 mb-0.5">Ticket #:</p>
                                  <p className="text-3xl font-bold text-gray-800">{numeroTicket}</p>
                                </div>
                                <div className="space-y-2.5 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Cédula:</p>
                                    <p className="font-semibold text-gray-800">{ocultarCedula(facturaActual.cedula)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Nombre:</p>
                                    <p className="font-semibold text-gray-800 break-words leading-tight">
                                      {facturaActual.nombre} {facturaActual.apellido}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Teléfono:</p>
                                    <p className="font-semibold text-gray-800">{facturaActual.telefono}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Fecha:</p>
                                    <p className="font-semibold text-gray-800">{fechaFormato}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Hora:</p>
                                    <p className="font-semibold text-gray-800">{horaFormato}</p>
                                  </div>
                                </div>
                                <div className="mt-3 pt-3 border-t text-center">
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                    Ticket {index + 1} de {facturaActual.totalEntregables}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMostrarDialogoTickets(false)} size="lg">
                  Cerrar
                </Button>
                <Button onClick={imprimirTickets} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-5 h-5 mr-2" />
                  Imprimir todos los tickets
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}