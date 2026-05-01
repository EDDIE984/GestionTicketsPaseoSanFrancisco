import { supabase } from '@/lib/supabase';

export interface ReporteriaEvento {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
}

export interface ReporteriaFactura {
  id: string;
  evento_id: string;
  cliente_id: string;
  local_id: string;
  usuario_id: string;
  numero_factura: string;
  monto_total: number;
  fecha_emision: string;
  total_entregables: number;
  tickets_impresos: boolean;
  tickets_impresos_at: string | null;
  fecha_registro: string;
  clientes: {
    cedula: string;
    nombre: string;
    apellido: string;
    direccion: string | null;
    telefono: string | null;
    correo: string | null;
    genero: string | null;
    formularios_consentimiento?: Array<{
      acepta_publicidad: boolean;
      acepta_proteccion_datos: boolean;
      fecha_aceptacion: string | null;
      formulario_enviado_at: string | null;
      correo_enviado_at: string | null;
    }>;
  } | null;
  eventos_campanas: {
    nombre: string;
    valor_minimo: number;
    valor_maximo: number;
  } | null;
  locales: {
    nombre: string;
    categorias: { nombre: string } | null;
  } | null;
  usuarios: {
    nombre: string;
    email: string;
  } | null;
  factura_metodos_pago: Array<{
    monto: number;
    cupon_numero: number | null;
    entregables_calculados: number;
    metodos_pago: { nombre: string } | null;
    cupones: { nombre: string } | null;
  }>;
}

export async function fetchEventosReporteria(): Promise<ReporteriaEvento[]> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select('id, nombre, fecha_inicio, fecha_fin, valor_minimo, valor_maximo, activo')
    .order('fecha_inicio', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ReporteriaEvento[];
}

export async function fetchFacturasReporteria(eventoId: string): Promise<ReporteriaFactura[]> {
  const pageSize = 1000;
  const rows: ReporteriaFactura[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('facturas')
      .select(`
        *,
        clientes(
          cedula,
          nombre,
          apellido,
          direccion,
          telefono,
          correo,
          genero,
          formularios_consentimiento(
            acepta_publicidad,
            acepta_proteccion_datos,
            fecha_aceptacion,
            formulario_enviado_at,
            correo_enviado_at
          )
        ),
        eventos_campanas(nombre, valor_minimo, valor_maximo),
        locales(nombre, categorias(nombre)),
        usuarios(nombre, email),
        factura_metodos_pago(
          monto,
          cupon_numero,
          entregables_calculados,
          metodos_pago(nombre),
          cupones(nombre)
        )
      `)
      .eq('evento_id', eventoId)
      .order('fecha_registro', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as ReporteriaFactura[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}
