import { supabase } from '@/lib/supabase';

export interface SaldoMetodoPago {
  metodo_pago_id: string | null;
  metodo_pago_nombre: string;
  saldo: number;
  updated_at: string;
}

export async function fetchSaldosCliente(
  clienteId: string,
  eventoId: string
): Promise<SaldoMetodoPago[]> {
  const { data, error } = await supabase
    .from('saldo_clientes')
    .select('metodo_pago_id, saldo, updated_at, metodos_pago(nombre)')
    .eq('cliente_id', clienteId)
    .eq('evento_id', eventoId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((row) => ({
    metodo_pago_id: row.metodo_pago_id ?? null,
    metodo_pago_nombre: row.metodos_pago?.nombre ?? 'Saldo histórico sin clasificar',
    saldo: Number(row.saldo ?? 0),
    updated_at: row.updated_at,
  }));
}

export async function registrarMovimientosSaldoFactura(params: {
  clienteId: string;
  eventoId: string;
  facturaId: string;
  movimientos: Array<{
    metodoPagoId: string;
    cuponAplicado: string | null;
    saldoAnterior: number;
    saldoNuevo: number;
    ticketsGenerados: number;
  }>;
}): Promise<void> {
  const { clienteId, eventoId, facturaId, movimientos } = params;
  const { error } = await supabase.rpc('registrar_movimientos_saldo_factura', {
    p_cliente_id: clienteId,
    p_evento_id: eventoId,
    p_factura_id: facturaId,
    p_movimientos: movimientos.map((movimiento) => ({
      metodo_pago_id: movimiento.metodoPagoId,
      cupon_aplicado: movimiento.cuponAplicado,
      saldo_anterior: movimiento.saldoAnterior,
      saldo_nuevo: movimiento.saldoNuevo,
      tickets_generados: movimiento.ticketsGenerados,
    })),
  });
  if (error) throw error;
}

export async function fetchHistorialSaldoEvento(
  clienteId: string,
  eventoId: string
): Promise<Array<{
  id: string;
  numero_factura: string;
  monto_factura: number;
  local_nombre: string;
  metodo_pago_id: string | null;
  metodo_pago_nombre: string;
  cupon_aplicado: string | null;
  saldo_anterior: number;
  saldo_nuevo: number;
  tickets_generados: number;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from('historial_saldo')
    .select('id, metodo_pago_id, cupon_aplicado, saldo_anterior, saldo_nuevo, tickets_generados, created_at, metodos_pago(nombre), facturas(numero_factura, monto_total, locales(nombre))')
    .eq('cliente_id', clienteId)
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((h) => ({
    id: h.id,
    numero_factura: h.facturas?.numero_factura ?? '',
    monto_factura: h.facturas?.monto_total ?? 0,
    local_nombre: h.facturas?.locales?.nombre ?? '—',
    metodo_pago_id: h.metodo_pago_id ?? null,
    metodo_pago_nombre: h.metodos_pago?.nombre ?? 'Sin clasificar',
    cupon_aplicado: h.cupon_aplicado ?? null,
    saldo_anterior: h.saldo_anterior,
    saldo_nuevo: h.saldo_nuevo,
    tickets_generados: h.tickets_generados,
    created_at: h.created_at,
  }));
}

export async function fetchTicketsAcumulados(
  clienteId: string,
  eventoId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('historial_saldo')
    .select('tickets_generados')
    .eq('cliente_id', clienteId)
    .eq('evento_id', eventoId);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.tickets_generados || 0), 0);
}

export async function fetchSaldoPorCliente(clienteId: string): Promise<{
  saldos: Array<{ evento_id: string; evento_nombre: string; metodo_pago_id: string | null; metodo_pago_nombre: string; saldo: number; updated_at: string }>;
  historial: Array<{
    id: string;
    evento_nombre: string;
    numero_factura: string;
    monto_factura: number;
    metodo_pago_id: string | null;
    metodo_pago_nombre: string;
    cupon_aplicado: string | null;
    saldo_anterior: number;
    saldo_nuevo: number;
    tickets_generados: number;
    created_at: string;
  }>;
}> {
  const [saldosRes, historialRes] = await Promise.all([
    supabase
      .from('saldo_clientes')
      .select('metodo_pago_id, saldo, updated_at, metodos_pago(nombre), eventos_campanas(id, nombre)')
      .eq('cliente_id', clienteId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('historial_saldo')
      .select('id, metodo_pago_id, cupon_aplicado, saldo_anterior, saldo_nuevo, tickets_generados, created_at, metodos_pago(nombre), eventos_campanas(nombre), facturas(numero_factura, monto_total)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false }),
  ]);

  if (saldosRes.error) throw saldosRes.error;
  if (historialRes.error) throw historialRes.error;

  return {
    saldos: ((saldosRes.data ?? []) as any[]).map((s) => ({
      evento_id: s.eventos_campanas?.id ?? '',
      evento_nombre: s.eventos_campanas?.nombre ?? '',
      metodo_pago_id: s.metodo_pago_id ?? null,
      metodo_pago_nombre: s.metodos_pago?.nombre ?? 'Saldo histórico sin clasificar',
      saldo: s.saldo,
      updated_at: s.updated_at,
    })),
    historial: ((historialRes.data ?? []) as any[]).map((h) => ({
      id: h.id,
      evento_nombre: h.eventos_campanas?.nombre ?? '',
      numero_factura: h.facturas?.numero_factura ?? '',
      monto_factura: h.facturas?.monto_total ?? 0,
      metodo_pago_id: h.metodo_pago_id ?? null,
      metodo_pago_nombre: h.metodos_pago?.nombre ?? 'Sin clasificar',
      cupon_aplicado: h.cupon_aplicado ?? null,
      saldo_anterior: h.saldo_anterior,
      saldo_nuevo: h.saldo_nuevo,
      tickets_generados: h.tickets_generados,
      created_at: h.created_at,
    })),
  };
}
