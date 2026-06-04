import { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { Badge } from '@/app/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, X, Printer, PlusCircle, FileStack, LoaderCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/app/components/AuthContext';
import { consultarCedula } from '@/lib/api/cedula';
import { enviarConsentimientoCliente } from '@/lib/api/consentimientos';
import { fetchClienteByCedula, upsertCliente } from '@/lib/api/clientes';
import {
  createFactura,
  existsFacturaByNumero,
  fetchFacturasDelDia,
  fetchEventosActivos,
  marcarFacturasComoImpresas,
  reversarFacturasRegistro,
} from '@/lib/api/facturas';
import { fetchLocales } from '@/lib/api/locales';
import { fetchMetodosPago } from '@/lib/api/metodos-pago';
import { fetchSaldoCliente, fetchSaldoPorCliente, fetchHistorialSaldoEvento, registrarMovimientoSaldo } from '@/lib/api/saldo';
import { checkPosPrinter, enviarTicketsACola, esperarTrabajoImpresion, type PosTicket } from '@/lib/api/pos-printer';
import type { FacturaVista } from '@/lib/types';

interface MetodoPagoLocal {
  id: string;
  nombre: string;
  monto: number;
  cuponId?: string;
  cuponNombre?: string;
  cuponNumero?: number;
  entregablesCalculados?: number;
}

interface FacturaPendiente {
  id: number;
  facturaId?: string;
  eventoNombre: string;
  eventoId: string;
  eventoValorMinimo: number;
  cedula: string;
  nombre: string;
  apellido: string;
  direccion: string;
  telefono: string;
  correo: string;
  genero: string;
  numeroFactura: string;
  montoTotal: number;
  fechaEmision: string;
  fechaRegistro?: string;
  metodosPago: MetodoPagoLocal[];
  totalEntregables: number;
  localId: string;
  localNombre?: string;
  cuponAplicado: string | null;
  saldoAnterior: number;
  saldoNuevo: number;
}

const TICKET_PAPER_CHARS = 42;
const FACTURA_MAX_LENGTH = 17;
const FACTURA_FORMAT_REGEX = /^\d{3}-\d{3}-\d{9}$/;
const FACTURA_FORMAT_LABEL = '001-001-000000397';

function formatearNumeroFactura(value: string) {
  const digitos = value.replace(/\D/g, '').slice(0, 15);
  const partes = [
    digitos.slice(0, 3),
    digitos.slice(3, 6),
    digitos.slice(6, 15),
  ].filter(Boolean);

  return partes.join('-');
}

interface EventoActivo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  evento_cupones: Array<{
    cupon_id: string;
    cupones: { id: string; nombre: string; numero: number };
  }>;
}

interface LocalDisponible {
  id: string;
  nombre: string;
  activo: boolean;
}

interface MetodoPagoDisponible {
  id: string;
  nombre: string;
  activo: boolean;
}

export function Registro() {
  const { user } = useAuth();

  // Remote data
  const [eventosActivos, setEventosActivos] = useState<EventoActivo[]>([]);
  const [localesDisponibles, setLocalesDisponibles] = useState<LocalDisponible[]>([]);
  const [metodosPagoDisponibles, setMetodosPagoDisponibles] = useState<MetodoPagoDisponible[]>([]);
  const [facturas, setFacturas] = useState<FacturaVista[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargandoDatos(true);

      const [eventosResult, localesResult, metodosPagoResult, facturasResult] = await Promise.allSettled([
        fetchEventosActivos(),
        fetchLocales(),
        fetchMetodosPago(),
        fetchFacturasDelDia(),
      ]);

      if (eventosResult.status === 'fulfilled') {
        setEventosActivos(eventosResult.value);
      } else {
        toast.error('Error al cargar eventos');
      }

      if (localesResult.status === 'fulfilled') {
        setLocalesDisponibles(localesResult.value.filter((l) => l.activo));
      }

      if (metodosPagoResult.status === 'fulfilled') {
        setMetodosPagoDisponibles(metodosPagoResult.value.filter((m) => m.activo));
      }

      if (facturasResult.status === 'fulfilled') {
        setFacturas(facturasResult.value);
      } else {
        toast.error('Error al cargar facturas');
      }

      setCargandoDatos(false);
    };

    cargarDatos();
  }, []);

  // Estado del cliente (persistente mientras se agregan facturas)
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [genero, setGenero] = useState('');
  const [consultandoCedula, setConsultandoCedula] = useState(false);
  const [ultimaCedulaConsultada, setUltimaCedulaConsultada] = useState('');
  const [guardandoFacturas, setGuardandoFacturas] = useState(false);
  const [validandoFactura, setValidandoFactura] = useState(false);
  const [marcandoImpresion, setMarcandoImpresion] = useState(false);
  const [reversandoRegistro, setReversandoRegistro] = useState(false);
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
  const [metodosPago, setMetodosPago] = useState<MetodoPagoLocal[]>([]);
  const [metodoSeleccionado, setMetodoSeleccionado] = useState('');
  const [montoMetodo, setMontoMetodo] = useState('');
  const [cuponSeleccionado, setCuponSeleccionado] = useState('');
  // Facturas pendientes por registrar (en memoria temporal)
  const [facturasPendientes, setFacturasPendientes] = useState<FacturaPendiente[]>([]);
  const [mostrarDialogoTickets, setMostrarDialogoTickets] = useState(false);
  const [facturasActuales, setFacturasActuales] = useState<FacturaPendiente[]>([]);
  const [ticketsImpresos, setTicketsImpresos] = useState(false);
  const [mostrarConfirmacionReverso, setMostrarConfirmacionReverso] = useState(false);
  const [motivoReverso, setMotivoReverso] = useState('');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [saldoAnterior, setSaldoAnterior] = useState<number>(0);
  const [mostrarHistorialSaldo, setMostrarHistorialSaldo] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [historialSaldoData, setHistorialSaldoData] = useState<Array<{
    id: string; numero_factura: string; monto_factura: number; local_nombre: string;
    cupon_aplicado: string | null; saldo_anterior: number; saldo_nuevo: number; tickets_generados: number; created_at: string;
  }>>([]);
  // Estados para la pestaña de consulta de saldo
  const [cedulaConsulta, setCedulaConsulta] = useState('');
  const [consultandoSaldo, setConsultandoSaldo] = useState(false);
  const [resultadoSaldo, setResultadoSaldo] = useState<{
    cliente: { nombre: string; apellido: string; cedula: string } | null;
    saldos: Array<{ evento_id: string; evento_nombre: string; saldo: number; updated_at: string }>;
    historial: Array<{ id: string; evento_nombre: string; numero_factura: string; monto_factura: number; cupon_aplicado: string | null; saldo_anterior: number; saldo_nuevo: number; tickets_generados: number; created_at: string }>;
  } | null>(null);

  const procesando = cargandoDatos || consultandoCedula || guardandoFacturas || validandoFactura || marcandoImpresion || reversandoRegistro;
  const mensajeProceso = guardandoFacturas
    ? 'Registrando facturas...'
    : consultandoCedula
      ? 'Consultando cédula...'
      : validandoFactura
        ? 'Validando factura...'
        : marcandoImpresion
          ? 'Marcando tickets como impresos...'
          : reversandoRegistro
            ? 'Reversando registro...'
            : 'Cargando información...';

  const calcularTotalMetodos = () => {
    return metodosPago.reduce((sum, m) => sum + m.monto, 0);
  };

  const totalMetodosCoincideConFactura = () => {
    const totalFactura = parseFloat(montoTotal);
    if (!Number.isFinite(totalFactura) || totalFactura <= 0) return false;
    return Math.abs(calcularTotalMetodos() - totalFactura) <= 0.009;
  };

  const calcularSaldoPendiente = () => {
    const totalFactura = parseFloat(montoTotal);
    if (!Number.isFinite(totalFactura) || totalFactura <= 0) return 0;
    return Math.max(totalFactura - calcularTotalMetodos(), 0);
  };

  const calcularSaldoAGenerar = () => {
    if (metodosPago.length === 0) return null;
    const valorMinimo = eventosActivos.find((e) => e.id === eventoId)?.valor_minimo;
    if (!valorMinimo || valorMinimo <= 0) return null;
    const primerMonto = metodosPago[0]?.monto ?? 0;
    return parseFloat((
      (primerMonto + saldoAnterior) % valorMinimo +
      metodosPago.slice(1).reduce((acc, m) => acc + (m.monto % valorMinimo), 0)
    ).toFixed(2));
  };

  useEffect(() => {
    const saldoPendiente = calcularSaldoPendiente();
    setMontoMetodo(saldoPendiente > 0 ? saldoPendiente.toFixed(2) : '');
  }, [montoTotal, metodosPago]);

  useEffect(() => {
    const cuponesEvento = eventosActivos.find((e) => e.id === eventoId)?.evento_cupones ?? [];
    if (cuponesEvento.length === 1) {
      setCuponSeleccionado(cuponesEvento[0].cupones.id);
    } else if (!cuponesEvento.some((ec) => ec.cupones.id === cuponSeleccionado)) {
      setCuponSeleccionado('');
    }
  }, [eventoId, eventosActivos, cuponSeleccionado]);

  useEffect(() => {
    if (!clienteId || !eventoId) {
      setSaldoAnterior(0);
      return;
    }
    fetchSaldoCliente(clienteId, eventoId)
      .then(setSaldoAnterior)
      .catch(() => setSaldoAnterior(0));
  }, [clienteId, eventoId]);

  const validarEventoVigente = (evento?: EventoActivo) => {
    if (!evento) return 'Debes seleccionar un evento válido';

    const ahora = Date.now();
    const inicio = new Date(evento.fecha_inicio).getTime();
    const fin = new Date(evento.fecha_fin).getTime();

    if (Number.isNaN(inicio) || Number.isNaN(fin)) {
      return 'El evento seleccionado no tiene una vigencia válida';
    }

    if (ahora < inicio || ahora > fin) {
      return 'El evento seleccionado no está vigente en este momento';
    }

    return null;
  };

  const validarMontoEvento = (evento: EventoActivo | undefined, monto: number) => {
    const errorVigencia = validarEventoVigente(evento);
    if (errorVigencia) return errorVigencia;
    if (!evento) return 'Debes seleccionar un evento válido';

    if (evento.valor_maximo > 0 && monto > evento.valor_maximo) {
      return `El monto no puede superar el valor máximo por factura del evento ($${evento.valor_maximo.toFixed(2)})`;
    }

    return null;
  };

  const agregarMetodoPago = () => {
    if (!metodoSeleccionado || !montoMetodo) {
      toast.error('Selecciona un método de pago y especifica el monto');
      return;
    }
    if (!eventoId) {
      toast.error('Debes seleccionar un evento primero');
      return;
    }
    if (!cuponSeleccionado) {
      toast.error('Selecciona un cupón');
      return;
    }
    const monto = parseFloat(montoMetodo);
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }
    const totalActual = calcularTotalMetodos();
    const montoTotalNum = parseFloat(montoTotal);
    if (!Number.isFinite(montoTotalNum) || montoTotalNum <= 0) {
      toast.error('Ingresa un monto total válido');
      return;
    }
    const evento = eventosActivos.find((e) => e.id === eventoId);
    const errorMontoEvento = validarMontoEvento(evento, montoTotalNum);
    if (errorMontoEvento) {
      toast.error(errorMontoEvento);
      return;
    }
    if (totalActual + monto > montoTotalNum) {
      toast.error('El total de los métodos de pago excede el monto de la factura');
      return;
    }

    const metodoNombre = metodosPagoDisponibles.find(
      (m) => m.id === metodoSeleccionado
    )?.nombre || '';

    // Obtener datos del evento
    const valorMinimo = evento?.valor_minimo || 1;

    // Obtener número del cupón (multiplicador)
    let cuponNumero = 1; // Por defecto sin cupón = multiplicador 1
    let cuponNombre: string | undefined = undefined;
    let cuponId: string | undefined = undefined;

    const eventoCupones = eventosActivos.find((e) => e.id === eventoId)?.evento_cupones ?? [];
    const cupon = eventoCupones.find((ec) => ec.cupones.id === cuponSeleccionado)?.cupones;
    if (!cupon) {
      toast.error('Selecciona un cupón válido');
      return;
    }
    cuponNumero = cupon.numero;
    cuponNombre = cupon.nombre;
    cuponId = cupon.id;

    // Calcular entregables: el saldo acumulado se suma al primer método de pago
    const esPrimerMetodo = metodosPago.length === 0;
    const montoEfectivo = esPrimerMetodo ? monto + saldoAnterior : monto;
    const entregablesBase = Math.floor(montoEfectivo / valorMinimo);
    const entregablesCalculados = entregablesBase * cuponNumero;

    setMetodosPago([
      ...metodosPago,
      {
        id: metodoSeleccionado,
        nombre: metodoNombre,
        monto: monto,
        cuponId: cuponId,
        cuponNombre: cuponNombre,
        cuponNumero: cuponNumero,
        entregablesCalculados: entregablesCalculados,
      },
    ]);

    setMetodoSeleccionado('');
    setCuponSeleccionado('');
  };

  const eliminarMetodoPago = (index: number) => {
    setMetodosPago(metodosPago.filter((_, i) => i !== index));
  };

  const obtenerCuponAplicado = (metodos: MetodoPagoLocal[]) => {
    const cupones = metodos
      .map((metodo) => metodo.cuponNombre?.trim())
      .filter((cupon): cupon is string => Boolean(cupon));

    return cupones.length ? Array.from(new Set(cupones)).join(', ') : null;
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
    setUltimaCedulaConsultada('');
    setClienteId(null);
    setSaldoAnterior(0);
    setEventoId('');
    limpiarFactura();
  };

  const separarNombreCompleto = (nombreCompleto?: string) => {
    const partes = (nombreCompleto ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length <= 2) {
      return { apellidos: '', nombres: partes.join(' ') };
    }

    return {
      apellidos: partes.slice(0, 2).join(' '),
      nombres: partes.slice(2).join(' '),
    };
  };

  const normalizarGenero = (valor?: string) => {
    const generoApi = (valor ?? '').trim().toLowerCase();
    if (['hombre', 'masculino', 'm'].includes(generoApi)) return 'masculino';
    if (['mujer', 'femenino', 'f'].includes(generoApi)) return 'femenino';
    return '';
  };

  const construirDireccion = (...partes: Array<string | undefined>) => {
    return partes
      .map((parte) => parte?.trim())
      .filter((parte): parte is string => Boolean(parte && parte !== '00'))
      .join(', ');
  };

  const cargarClienteGuardado = async (cedulaLimpia: string) => {
    const cliente = await fetchClienteByCedula(cedulaLimpia);
    if (!cliente) return false;

    setCedula(cliente.cedula);
    setNombre(cliente.nombre);
    setApellido(cliente.apellido);
    setDireccion(cliente.direccion ?? '');
    setTelefono(cliente.telefono ?? '');
    setCorreo(cliente.correo ?? '');
    setGenero(cliente.genero ?? '');
    setClienteId(cliente.id);
    setUltimaCedulaConsultada(cedulaLimpia);
    toast.success('Cliente cargado desde la base');
    return true;
  };

  const consultarDatosCedula = async () => {
    const cedulaLimpia = cedula.trim();
    if (!cedulaLimpia || cedulaLimpia === ultimaCedulaConsultada) return;

    setConsultandoCedula(true);
    try {
      const clienteExiste = await cargarClienteGuardado(cedulaLimpia);
      if (clienteExiste) return;

      const datos = await consultarCedula(cedulaLimpia);
      if (!datos?.cedula && !datos?.nombre) {
        toast.error('No se encontró información para la cédula ingresada');
        return;
      }

      const { nombres, apellidos } = separarNombreCompleto(datos.nombre);
      const direccionApi = construirDireccion(
        datos.lugarDomicilio,
        datos.calleDomicilio,
        datos.numeracionDomicilio
      );
      const generoApi = normalizarGenero(datos.genero);

      setCedula(datos.cedula ?? cedulaLimpia);
      setNombre(nombres);
      setApellido(apellidos);
      if (direccionApi) setDireccion(direccionApi);
      if (generoApi) setGenero(generoApi);
      setUltimaCedulaConsultada(cedulaLimpia);
      toast.success('Datos de cédula cargados');
    } catch {
      toast.error('No se pudo consultar la cédula');
    } finally {
      setConsultandoCedula(false);
    }
  };

  // Agregar factura a la lista temporal
  const validarNumeroFacturaDisponible = async (numero: string) => {
    const numeroLimpio = numero.trim();
    if (!numeroLimpio) return 'Ingresa el número de factura';
    if (!FACTURA_FORMAT_REGEX.test(numeroLimpio)) {
      return `La factura debe tener el formato ${FACTURA_FORMAT_LABEL}`;
    }

    const duplicadaPendiente = facturasPendientes.some(
      (factura) =>
        factura.numeroFactura.trim() === numeroLimpio &&
        factura.localId === localId &&
        factura.eventoId === eventoId
    );
    if (duplicadaPendiente) {
      return `La factura ${numeroLimpio} ya está en la lista pendiente para este local y campaña`;
    }

    const existeEnBase = await existsFacturaByNumero(numeroLimpio, localId, eventoId);
    if (existeEnBase) {
      return `La factura ${numeroLimpio} ya fue registrada por este local en esta campaña`;
    }

    return null;
  };

  const agregarFacturaPendiente = async () => {
    // Validar campos vacíos
    const campos = [eventoId, localId, cedula, nombre, apellido, direccion, telefono, correo, genero, numeroFactura, montoTotal, fechaEmision];
    if (campos.some((c) => !c || c.trim() === '')) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (metodosPago.length === 0) {
      toast.error('Debe agregar al menos un método de pago');
      return;
    }

    setValidandoFactura(true);
    try {
      const errorNumeroFactura = await validarNumeroFacturaDisponible(numeroFactura);
      if (errorNumeroFactura) {
        toast.error(errorNumeroFactura);
        return;
      }
    } catch {
      toast.error('No se pudo validar si la factura ya existe');
      return;
    } finally {
      setValidandoFactura(false);
    }

    const totalMetodos = calcularTotalMetodos();
    const montoTotalNum = parseFloat(montoTotal);
    if (!Number.isFinite(montoTotalNum) || montoTotalNum <= 0) {
      toast.error('Ingresa un monto total válido');
      return;
    }
    const eventoSeleccionado = eventosActivos.find((e) => e.id === eventoId);
    const errorMontoEvento = validarMontoEvento(eventoSeleccionado, montoTotalNum);
    if (errorMontoEvento) {
      toast.error(errorMontoEvento);
      return;
    }

    if (Math.abs(totalMetodos - montoTotalNum) > 0.009) {
      toast.error(`El total de los métodos de pago ($${totalMetodos.toFixed(2)}) debe ser igual al monto total de la factura ($${montoTotalNum.toFixed(2)})`);
      return;
    }
    const eventoNombre = eventoSeleccionado?.nombre || '';
    const eventoValorMinimo = eventoSeleccionado?.valor_minimo || 0;
    const localNombre = localesDisponibles.find((l) => l.id === localId)?.nombre || '';

    const eventoValorMinimoLocal = eventoSeleccionado?.valor_minimo ?? 1;
    const primerMonto = metodosPago[0]?.monto ?? 0;
    const nuevoSaldo = parseFloat((
      (primerMonto + saldoAnterior) % eventoValorMinimoLocal +
      metodosPago.slice(1).reduce((acc, m) => acc + (m.monto % eventoValorMinimoLocal), 0)
    ).toFixed(2));

    const nuevaFactura: FacturaPendiente = {
      id: Date.now() + Math.floor(Math.random() * 10000),
      eventoNombre,
      localId,
      localNombre,
      eventoId,
      eventoValorMinimo,
      cedula,
      nombre,
      apellido,
      direccion,
      telefono,
      correo,
      genero,
      numeroFactura: numeroFactura.trim(),
      montoTotal: montoTotalNum,
      fechaEmision,
      metodosPago: [...metodosPago],
      totalEntregables: metodosPago.reduce((sum, m) => sum + (m.entregablesCalculados || 0), 0),
      cuponAplicado: obtenerCuponAplicado(metodosPago),
      saldoAnterior,
      saldoNuevo: nuevoSaldo,
    };
    setFacturasPendientes([nuevaFactura, ...facturasPendientes]);
    setSaldoAnterior(nuevoSaldo);
    limpiarFactura();
  };

  // Registrar todas las facturas pendientes contra Supabase
  const registrarFacturas = async () => {
    if (facturasPendientes.length === 0) {
      toast.error('No hay facturas pendientes por registrar');
      return;
    }
    if (!user) {
      toast.error('Debes iniciar sesión para registrar facturas');
      return;
    }

    setGuardandoFacturas(true);
    try {
      const claves = facturasPendientes.map((f) => `${f.numeroFactura.trim()}|${f.localId}|${f.eventoId}`);
      const claveDuplicada = claves.find((clave, i) => claves.indexOf(clave) !== i);
      if (claveDuplicada) {
        const numero = claveDuplicada.split('|')[0];
        toast.error(`La factura ${numero} está repetida para el mismo local y campaña`);
        return;
      }

      for (const fp of facturasPendientes) {
        if (await existsFacturaByNumero(fp.numeroFactura.trim(), fp.localId, fp.eventoId)) {
          toast.error(`La factura ${fp.numeroFactura} ya fue registrada por este local en esta campaña`);
          return;
        }
      }

      const consentimientosPendientes = new Map<string, string[]>();
      const facturasRegistradas: FacturaPendiente[] = [];

      for (const fp of facturasPendientes) {
        // 1. Upsert cliente
        const cliente = await upsertCliente({
          cedula: fp.cedula,
          nombre: fp.nombre,
          apellido: fp.apellido,
          direccion: fp.direccion,
          telefono: fp.telefono,
          correo: fp.correo,
          genero: fp.genero as 'masculino' | 'femenino',
        });

        // 2. Crear factura
        const factura = await createFactura(
          {
            evento_id: fp.eventoId,
            cliente_id: cliente.id,
            local_id: fp.localId,
            usuario_id: user.id,
            numero_factura: fp.numeroFactura,
            monto_total: fp.montoTotal,
            fecha_emision: fp.fechaEmision,
            total_entregables: fp.totalEntregables,
          },
          fp.metodosPago.map((m) => ({
            metodo_pago_id: m.id,
            monto: m.monto,
            cupon_id: m.cuponId ?? null,
            cupon_numero: m.cuponNumero ?? null,
            entregables_calculados: m.entregablesCalculados ?? 0,
          }))
        );

        // 3. Registrar movimiento de saldo (se guarda aquí, independiente de la impresión)
        try {
          await registrarMovimientoSaldo({
            clienteId: cliente.id,
            eventoId: fp.eventoId,
            facturaId: factura.id,
            cuponAplicado: fp.cuponAplicado,
            saldoAnterior: fp.saldoAnterior,
            saldoNuevo: fp.saldoNuevo,
            ticketsGenerados: fp.totalEntregables,
          });
        } catch (saldoError) {
          console.error('No se pudo registrar el movimiento de saldo', saldoError);
          toast.warning('Factura registrada, pero no se pudo guardar el saldo. Verifica que las tablas de saldo existen en Supabase.');
        }

        const facturaIds = consentimientosPendientes.get(cliente.id) ?? [];
        facturaIds.push(factura.id);
        consentimientosPendientes.set(cliente.id, facturaIds);
        facturasRegistradas.push({
          ...fp,
          facturaId: factura.id,
          fechaRegistro: factura.fecha_registro,
        });
      }

      for (const [clienteId, facturaIds] of consentimientosPendientes.entries()) {
        try {
          const result = await enviarConsentimientoCliente(clienteId, facturaIds);
          if (result.skipped) {
            toast.info('El cliente ya aceptó la política de protección de datos');
          }
        } catch {
          toast.error('Las facturas se registraron, pero no se pudo enviar el correo de consentimiento');
        }
      }

      // Recargar facturas del día
      const actualizadas = await fetchFacturasDelDia();
      setFacturas(actualizadas);

      setFacturasActuales(facturasRegistradas);
      setFacturasPendientes([]);
      setMostrarDialogoTickets(true);
      setTicketsImpresos(false);
      limpiarCliente();
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const esDuplicada = message.includes('duplicate') || message.includes('facturas_numero_factura_key');
      toast.error(esDuplicada ? 'Una de las facturas ya fue registrada previamente' : 'Error al registrar las facturas');
    } finally {
      setGuardandoFacturas(false);
    }
  };

  // Función para ocultar cédula parcialmente (muestra últimos 3 dígitos)
  const ocultarCedula = (ced: string) => {
    if (ced.length <= 3) return ced;
    const visible = ced.slice(-3);
    const oculto = 'X'.repeat(ced.length - 3);
    return oculto + visible;
  };

  const formatearFechaHoraRegistro = (value?: string) => {
    const date = value ? new Date(value) : new Date();
    return date.toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  // Función para generar número de ticket único
  const generarNumeroTicket = (factura: FacturaPendiente, indice: number) => {
    return `${factura.numeroFactura}-${String(indice + 1).padStart(4, '0')}`;
  };

  const construirTicketPos = (factura: FacturaPendiente, indice: number, total: number): PosTicket => ({
    ticketNumero: generarNumeroTicket(factura, indice),
    cedula: ocultarCedula(factura.cedula),
    nombre: `${factura.nombre} ${factura.apellido}`.trim(),
    telefono: factura.telefono,
    fechaHora: formatearFechaHoraRegistro(factura.fechaRegistro),
    local: factura.localNombre || '—',
    index: indice + 1,
    total,
  });

  const normalizarTextoTicket = (value: string | number | null | undefined) =>
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');

  const centrarLineaTicket = (value: string) => {
    const text = normalizarTextoTicket(value).slice(0, TICKET_PAPER_CHARS);
    const padding = Math.max(Math.floor((TICKET_PAPER_CHARS - text.length) / 2), 0);
    return `${' '.repeat(padding)}${text}`;
  };

  const envolverLineaTicket = (value: string, width = TICKET_PAPER_CHARS) => {
    const words = normalizarTextoTicket(value).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if (word.length > width) {
        if (current) {
          lines.push(current);
          current = '';
        }
        for (let i = 0; i < word.length; i += width) {
          lines.push(word.slice(i, i + width));
        }
        continue;
      }

      if (`${current} ${word}`.trim().length > width) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = `${current} ${word}`.trim();
      }
    }

    if (current) lines.push(current);
    return lines.length ? lines : [''];
  };

  const centrarLineasTicket = (value: string) =>
    envolverLineaTicket(value).map((linea) => centrarLineaTicket(linea));

  const construirLineasPreviewTicket = (ticket: PosTicket) => [
    centrarLineaTicket('PASEO SAN FRANCISCO'),
    ...centrarLineasTicket('Ticket #:'),
    ...centrarLineasTicket(ticket.ticketNumero),
    '-'.repeat(TICKET_PAPER_CHARS),
    `Cedula: ${normalizarTextoTicket(ticket.cedula)}`,
    ...envolverLineaTicket(`Nombre: ${ticket.nombre}`),
    `Telefono: ${normalizarTextoTicket(ticket.telefono)}`,
    `Fecha/Hora: ${normalizarTextoTicket(ticket.fechaHora)}`,
    ...envolverLineaTicket(`Local: ${ticket.local}`),
    '-'.repeat(TICKET_PAPER_CHARS),
    centrarLineaTicket(`${ticket.index} de ${ticket.total}`),
  ];

  const construirTicketsPos = (): PosTicket[] => {
    return facturasActuales.flatMap((facturaActual) =>
      Array.from({ length: facturaActual.totalEntregables }).map((_, index) =>
        construirTicketPos(facturaActual, index, facturaActual.totalEntregables),
      )
    );
  };

  // Función para imprimir tickets
  const imprimirTickets = async () => {
    if (ticketsImpresos) return;

    const facturaIds = facturasActuales
      .map((factura) => factura.facturaId)
      .filter((id): id is string => Boolean(id));

    if (facturaIds.length !== facturasActuales.length) {
      toast.error('No se pudo identificar todas las facturas para marcar la impresión');
      return;
    }

    setMarcandoImpresion(true);
    try {
      await checkPosPrinter();
      const tickets = construirTicketsPos();
      const job = await enviarTicketsACola(tickets);
      toast.info(`Impresión enviada a la cola. Esperando confirmación (${job.totalTickets} tickets)...`);
      await esperarTrabajoImpresion(job.jobId);
      await marcarFacturasComoImpresas(facturaIds);
      setTicketsImpresos(true);
      const actualizadas = await fetchFacturasDelDia();
      setFacturas(actualizadas);
      toast.success(`Tickets impresos correctamente (${job.totalTickets})`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar los tickets a impresión');
    } finally {
      setMarcandoImpresion(false);
    }
  };

  const reversarRegistroActual = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para reversar el registro');
      return;
    }
    if (ticketsImpresos) {
      toast.error('No se puede reversar porque los tickets ya fueron impresos');
      return;
    }

    const facturaIds = facturasActuales
      .map((factura) => factura.facturaId)
      .filter((id): id is string => Boolean(id));

    if (facturaIds.length !== facturasActuales.length) {
      toast.error('No se pudo identificar todas las facturas para reversar');
      return;
    }

    setReversandoRegistro(true);
    try {
      const result = await reversarFacturasRegistro({
        facturaIds,
        usuarioId: user.id,
        motivo: motivoReverso,
      });
      const actualizadas = await fetchFacturasDelDia();
      setFacturas(actualizadas);
      setFacturasActuales([]);
      setMostrarDialogoTickets(false);
      setMostrarConfirmacionReverso(false);
      setMotivoReverso('');
      setTicketsImpresos(false);
      toast.success(`Registro reversado correctamente (${result.facturas_reversadas} factura${result.facturas_reversadas === 1 ? '' : 's'})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo reversar el registro';
      toast.error(message);
    } finally {
      setReversandoRegistro(false);
    }
  };

  const abrirHistorialSaldo = async () => {
    if (!clienteId || !eventoId) return;
    setMostrarHistorialSaldo(true);
    setCargandoHistorial(true);
    try {
      const historial = await fetchHistorialSaldoEvento(clienteId, eventoId);
      setHistorialSaldoData(historial);
    } catch {
      toast.error('No se pudo cargar el historial de saldo');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const consultarSaldoCliente = async () => {
    const cedulaLimpia = cedulaConsulta.trim();
    if (!cedulaLimpia) return;
    setConsultandoSaldo(true);
    setResultadoSaldo(null);
    try {
      const cliente = await fetchClienteByCedula(cedulaLimpia);
      if (!cliente) {
        toast.error('No se encontró un cliente con esa cédula');
        return;
      }
      const { saldos, historial } = await fetchSaldoPorCliente(cliente.id);
      setResultadoSaldo({ cliente, saldos, historial });
    } catch {
      toast.error('No se pudo consultar el saldo');
    } finally {
      setConsultandoSaldo(false);
    }
  };

  // Facturas del día vienen de Supabase (ya filtradas por fecha)
  const facturasDelDia = facturas;

  return (
    <div className="p-8">
      {procesando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="absolute left-0 right-0 top-0 h-1 overflow-hidden bg-slate-200">
            <div className="h-full w-1/3 animate-[pulse_1.1s_ease-in-out_infinite] bg-blue-600" />
          </div>
          <div
            className="flex min-w-64 items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-lg"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-800">{mensajeProceso}</span>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl mb-2">Registro de Facturas</h1>
        <p className="text-gray-600">Registra facturas de eventos y campañas</p>
      </div>

      <Tabs defaultValue="registro" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="facturas">Facturas del Día ({facturasDelDia.length})</TabsTrigger>
          <TabsTrigger value="saldo">Consulta de Saldo</TabsTrigger>
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
                      <SelectItem key={evento.id} value={evento.id}>
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
                    onBlur={consultarDatosCedula}
                    placeholder="Número de cédula"
                    disabled={consultandoCedula}
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
                        {localesDisponibles.map((local) => (
                          <SelectItem key={local.id} value={local.id}>
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNumeroFactura(formatearNumeroFactura(e.target.value))}
                      placeholder={FACTURA_FORMAT_LABEL}
                      inputMode="numeric"
                      maxLength={FACTURA_MAX_LENGTH}
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

                {clienteId && eventoId && (
                  <div className="flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div>
                        <span className="text-amber-700 text-xs uppercase tracking-wide font-medium">Saldo acumulado</span>
                        <p className="text-2xl font-bold text-amber-800 tabular-nums leading-tight">${saldoAnterior.toFixed(2)}</p>
                      </div>
                      {saldoAnterior > 0 && (
                        <span className="text-amber-600 text-xs">Se aplicará al primer método de pago</span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0"
                      onClick={abrirHistorialSaldo}
                    >
                      Ver historial
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="metodoPago">Método de Pago</Label>
                    <Select value={metodoSeleccionado} onValueChange={setMetodoSeleccionado}>
                      <SelectTrigger id="metodoPago">
                        <SelectValue placeholder="Selecciona método" />
                      </SelectTrigger>
                      <SelectContent>
                        {metodosPagoDisponibles.map((metodo) => (
                          <SelectItem key={metodo.id} value={metodo.id}>
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
                    <Label htmlFor="cuponMetodo">Cupón *</Label>
                    <Select
                      value={cuponSeleccionado}
                      onValueChange={setCuponSeleccionado}
                      disabled={!eventoId}
                    >
                      <SelectTrigger id="cuponMetodo">
                        <SelectValue placeholder={eventoId ? "Selecciona cupón" : "Selecciona evento primero"} />
                      </SelectTrigger>
                      <SelectContent>
                        {eventoId &&
                          eventosActivos
                            .find((e) => e.id === eventoId)
                            ?.evento_cupones.map(({ cupones }) => (
                              <SelectItem key={cupones.id} value={cupones.id}>
                                {cupones.nombre} (x{cupones.numero})
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={agregarMetodoPago}
                      type="button"
                      className="w-full bg-black text-white hover:bg-gray-900"
                    >
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
                            {index === 0 && saldoAnterior > 0 && (
                              <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                                + ${saldoAnterior.toFixed(2)} saldo
                              </span>
                            )}
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
                        <span className={`text-lg font-bold ${totalMetodosCoincideConFactura() ? 'text-green-600' : 'text-red-600'}`}>
                          ${calcularTotalMetodos().toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Entregables:</span>
                        <span className="text-lg font-bold text-green-600">
                          {metodosPago.reduce((sum, m) => sum + (m.entregablesCalculados || 0), 0)}
                        </span>
                      </div>
                      {(() => {
                        const saldoAGenerar = calcularSaldoAGenerar();
                        if (saldoAGenerar === null) return null;
                        return (
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-amber-700">Saldo a acumular:</span>
                            <span className="text-lg font-bold text-amber-600">${saldoAGenerar.toFixed(2)}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                      {totalMetodosCoincideConFactura() ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>El total coincide con el monto de la factura</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          Agrega métodos de pago hasta completar el monto de la factura.
                        </div>
                      )}
                      <Button
                        onClick={agregarFacturaPendiente}
                        disabled={procesando || !totalMetodosCoincideConFactura()}
                        className="bg-black text-white hover:bg-gray-900 sm:min-w-36"
                      >
                        <PlusCircle className="w-5 h-5 mr-2" />
                        {validandoFactura ? 'Validando...' : 'Agregar'}
                      </Button>
                      </div>
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
                            <TableCell className="max-w-36 whitespace-normal break-all font-medium">{factura.numeroFactura}</TableCell>
                            <TableCell className="font-semibold tabular-nums">${factura.montoTotal.toFixed(2)}</TableCell>
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
                <Button onClick={registrarFacturas} variant="default" disabled={facturasPendientes.length === 0 || procesando}>
                  {guardandoFacturas ? (
                    <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <FileStack className="w-5 h-5 mr-2" />
                  )}
                  {guardandoFacturas ? 'Registrando...' : 'Registrar facturas'}
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
                          <TableCell className="font-medium">{factura.eventos_campanas?.nombre}</TableCell>
                          <TableCell>{factura.clientes?.cedula}</TableCell>
                          <TableCell>
                            {factura.clientes?.nombre} {factura.clientes?.apellido}
                          </TableCell>
                          <TableCell>
                            <Badge variant={factura.clientes?.genero === 'masculino' ? 'default' : 'secondary'}>
                              {factura.clientes?.genero}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-36 whitespace-normal break-all font-medium">{factura.numero_factura}</TableCell>
                          <TableCell className="font-semibold tabular-nums">
                            ${factura.monto_total.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="bg-green-600">
                              {factura.total_entregables}
                            </Badge>
                          </TableCell>
                          <TableCell>{factura.fecha_emision}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {factura.factura_metodos_pago.map((metodo, idx) => (
                                <div key={idx} className="text-sm">
                                  <span className="font-medium">{metodo.metodos_pago?.nombre}:</span> ${metodo.monto.toFixed(2)}
                                  {metodo.cupones?.nombre && (
                                    <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                      {metodo.cupones.nombre} (x{metodo.cupon_numero})
                                    </span>
                                  )}
                                  <span className="ml-2 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                    {metodo.entregables_calculados} entregables
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {new Date(factura.fecha_registro).toLocaleString()}
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

        <TabsContent value="saldo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Consulta de Saldo por Cliente</CardTitle>
              <CardDescription>Ingresa la cédula para ver el saldo acumulado e historial de movimientos por campaña</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 max-w-sm mb-6">
                <Input
                  placeholder="Número de cédula"
                  value={cedulaConsulta}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCedulaConsulta(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && consultarSaldoCliente()}
                />
                <Button onClick={consultarSaldoCliente} disabled={consultandoSaldo}>
                  {consultandoSaldo ? <LoaderCircle className="h-4 w-4 animate-spin" /> : 'Consultar'}
                </Button>
              </div>

              {resultadoSaldo && (
                <div className="space-y-6">
                  <div className="rounded-lg border p-4 bg-gray-50">
                    <p className="font-semibold text-lg">{resultadoSaldo.cliente?.nombre} {resultadoSaldo.cliente?.apellido}</p>
                    <p className="text-sm text-gray-500">Cédula: {resultadoSaldo.cliente?.cedula}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Saldo actual por campaña</h3>
                    {resultadoSaldo.saldos.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin saldo registrado en ninguna campaña</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {resultadoSaldo.saldos.map((s) => (
                          <div key={s.evento_id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-amber-900">{s.evento_nombre}</p>
                              <p className="text-xs text-amber-700">Actualizado: {new Date(s.updated_at).toLocaleString('es-EC')}</p>
                            </div>
                            <p className="text-2xl font-bold text-amber-800 tabular-nums">${Number(s.saldo).toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Historial de movimientos</h3>
                    {resultadoSaldo.historial.length === 0 ? (
                      <p className="text-sm text-gray-500">Sin historial</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="w-full" style={{ minWidth: '1180px' }}>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Campaña</TableHead>
                              <TableHead>No. Factura</TableHead>
                              <TableHead>Cupón</TableHead>
                              <TableHead className="text-right">Monto Factura</TableHead>
                              <TableHead className="text-right">Saldo Anterior</TableHead>
                              <TableHead className="text-right">Saldo Nuevo</TableHead>
                              <TableHead className="text-right">Variación</TableHead>
                              <TableHead className="text-right">Tickets</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resultadoSaldo.historial.map((h) => {
                              const variacion = h.saldo_nuevo - h.saldo_anterior;
                              return (
                                <TableRow key={h.id}>
                                  <TableCell className="text-sm">{new Date(h.created_at).toLocaleString('es-EC')}</TableCell>
                                  <TableCell className="text-sm">{h.evento_nombre}</TableCell>
                                  <TableCell className="text-sm font-mono">{h.numero_factura}</TableCell>
                                  <TableCell className="text-sm">{h.cupon_aplicado ?? '—'}</TableCell>
                                  <TableCell className="text-right tabular-nums">${Number(h.monto_factura).toFixed(2)}</TableCell>
                                  <TableCell className="text-right tabular-nums">${Number(h.saldo_anterior).toFixed(2)}</TableCell>
                                  <TableCell className="text-right tabular-nums font-semibold">${Number(h.saldo_nuevo).toFixed(2)}</TableCell>
                                  <TableCell className={`text-right tabular-nums font-medium ${variacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{h.tickets_generados}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo de Historial de Saldo */}
      <Dialog open={mostrarHistorialSaldo} onOpenChange={setMostrarHistorialSaldo}>
        <DialogContent className="w-[96vw] !max-w-[1200px] sm:!max-w-[1200px] max-h-[85vh] flex flex-col p-0 gap-0">
          <div className="px-6 pt-6 pb-4 border-b shrink-0">
            <h2 className="text-lg font-semibold leading-tight">Historial de Saldo — {nombre} {apellido}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {eventosActivos.find((e) => e.id === eventoId)?.nombre ?? ''} · Saldo actual:
              <span className="font-bold text-amber-700 ml-1">${saldoAnterior.toFixed(2)}</span>
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 pt-4">
            {cargandoHistorial ? (
              <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span>Cargando historial...</span>
              </div>
            ) : historialSaldoData.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                No hay transacciones previas con saldo para esta campaña.
              </div>
            ) : (
              <Table className="w-full" style={{ minWidth: '1240px' }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">No. Factura</TableHead>
                    <TableHead className="whitespace-nowrap">Local</TableHead>
                    <TableHead className="whitespace-nowrap">Cupón</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Monto</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Saldo Anterior</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Saldo Nuevo</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Variación</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Tickets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historialSaldoData.map((h) => {
                    const variacion = h.saldo_nuevo - h.saldo_anterior;
                    return (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm whitespace-nowrap">{new Date(h.created_at).toLocaleString('es-EC')}</TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap">{h.numero_factura}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{h.local_nombre}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{h.cupon_aplicado ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">${Number(h.monto_factura).toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">${Number(h.saldo_anterior).toFixed(2)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold whitespace-nowrap">${Number(h.saldo_nuevo).toFixed(2)}</TableCell>
                        <TableCell className={`text-right tabular-nums font-medium whitespace-nowrap ${variacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{h.tickets_generados}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

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
                  {facturasActuales.map((facturaActual) => (
                    <div key={facturaActual.id}>
                      <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                        <h3 className="font-semibold mb-3">Resumen de Factura</h3>
                        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_max-content]">
                          <div className="min-w-0">
                            <span className="text-gray-600">Evento:</span>
                            <p className="font-medium break-words">{facturaActual.eventoNombre}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">Cliente:</span>
                            <p className="font-medium break-words">{facturaActual.nombre} {facturaActual.apellido}</p>
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-600">No. Factura:</span>
                            <p className="font-medium break-all">{facturaActual.numeroFactura}</p>
                          </div>
                          <div className="min-w-0 lg:text-right">
                            <span className="text-gray-600">Monto Total:</span>
                            <p className="font-medium tabular-nums">${facturaActual.montoTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {(facturaActual.saldoAnterior > 0 || facturaActual.saldoNuevo > 0) && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm">
                          <h4 className="font-semibold text-amber-800 mb-2">Saldo Acumulado</h4>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-amber-700 text-xs uppercase tracking-wide">Saldo anterior</p>
                              <p className="font-bold text-amber-900 tabular-nums">${facturaActual.saldoAnterior.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-amber-700 text-xs uppercase tracking-wide">Monto efectivo (1er método)</p>
                              <p className="font-bold text-amber-900 tabular-nums">
                                ${((facturaActual.metodosPago[0]?.monto ?? 0) + facturaActual.saldoAnterior).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-amber-700 text-xs uppercase tracking-wide">Nuevo saldo</p>
                              <p className="font-bold text-amber-900 tabular-nums">${facturaActual.saldoNuevo.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <h3 className="font-semibold mb-4">Tickets de Entrega</h3>
                        {facturaActual.totalEntregables === 0 ? (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                            Esta factura no generó tickets — el monto se acumuló como saldo para la próxima visita.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Array.from({ length: facturaActual.totalEntregables }).map((_, index) => {
                              const ticket = construirTicketPos(facturaActual, index, facturaActual.totalEntregables);
                              const previewLines = construirLineasPreviewTicket(ticket);
                              return (
                                <div
                                  key={index}
                                  className="overflow-hidden rounded-md border border-slate-300 bg-slate-100 p-3 shadow-sm transition-shadow hover:shadow-md print:break-inside-avoid"
                                >
                                  <div className="mx-auto w-full max-w-[310px] bg-white px-4 py-5 text-slate-950 shadow-inner">
                                    <pre className="m-0 overflow-hidden whitespace-pre-wrap break-words font-mono text-[11px] leading-5 tracking-normal">{previewLines.join('\n')}</pre>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4 border-t bg-white flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMostrarDialogoTickets(false)} size="lg">
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMostrarConfirmacionReverso(true)}
                  size="lg"
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  disabled={ticketsImpresos || marcandoImpresion || reversandoRegistro}
                >
                  {reversandoRegistro ? (
                    <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-5 h-5 mr-2" />
                  )}
                  Reversar registro
                </Button>
                <Button
                  onClick={imprimirTickets}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={
                    ticketsImpresos ||
                    marcandoImpresion ||
                    reversandoRegistro ||
                    facturasActuales.every((f) => f.totalEntregables === 0)
                  }
                >
                  {marcandoImpresion ? (
                    <LoaderCircle className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Printer className="w-5 h-5 mr-2" />
                  )}
                  {ticketsImpresos ? 'Tickets impresos' : marcandoImpresion ? 'Marcando...' : 'Imprimir todos los tickets'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={mostrarConfirmacionReverso} onOpenChange={setMostrarConfirmacionReverso}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reversar registro</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán las facturas recién registradas, sus métodos de pago y los movimientos de saldo asociados. El saldo del cliente volverá al valor anterior al registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivoReverso">Motivo del reverso</Label>
            <Textarea
              id="motivoReverso"
              value={motivoReverso}
              onChange={(event) => setMotivoReverso(event.target.value)}
              placeholder="Ejemplo: error en número de factura o monto registrado"
              disabled={reversandoRegistro}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reversandoRegistro}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700"
              onClick={reversarRegistroActual}
              disabled={reversandoRegistro}
            >
              {reversandoRegistro && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar reverso
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
