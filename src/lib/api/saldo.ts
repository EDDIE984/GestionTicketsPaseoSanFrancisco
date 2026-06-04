import { supabase } from '@/lib/supabase';

export async function fetchSaldoCliente(
  clienteId: string,
  eventoId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('saldo_clientes')
    .select('saldo')
    .eq('cliente_id', clienteId)
    .eq('evento_id', eventoId)
    .maybeSingle();
  if (error) throw error;
  return data?.saldo ?? 0;
}

export async function registrarMovimientoSaldo(params: {
  clienteId: string;
  eventoId: string;
  facturaId: string;
  cuponAplicado: string | null;
  saldoAnterior: number;
  saldoNuevo: number;
  ticketsGenerados: number;
}): Promise<void> {
  const { clienteId, eventoId, facturaId, cuponAplicado, saldoAnterior, saldoNuevo, ticketsGenerados } = params;

  const { error: upsertError } = await supabase
    .from('saldo_clientes')
    .upsert(
      {
        cliente_id: clienteId,
        evento_id: eventoId,
        saldo: saldoNuevo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'cliente_id,evento_id' }
    );
  if (upsertError) throw upsertError;

  const { error: histError } = await supabase
    .from('historial_saldo')
    .insert({
      cliente_id: clienteId,
      evento_id: eventoId,
      factura_id: facturaId,
      cupon_aplicado: cuponAplicado,
      saldo_anterior: saldoAnterior,
      saldo_nuevo: saldoNuevo,
      tickets_generados: ticketsGenerados,
    });
  if (histError) throw histError;
}

export async function fetchHistorialSaldoEvento(
  clienteId: string,
  eventoId: string
): Promise<Array<{
  id: string;
  numero_factura: string;
  monto_factura: number;
  local_nombre: string;
  cupon_aplicado: string | null;
  saldo_anterior: number;
  saldo_nuevo: number;
  tickets_generados: number;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from('historial_saldo')
    .select('id, cupon_aplicado, saldo_anterior, saldo_nuevo, tickets_generados, created_at, facturas(numero_factura, monto_total, locales(nombre))')
    .eq('cliente_id', clienteId)
    .eq('evento_id', eventoId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map((h) => ({
    id: h.id,
    numero_factura: h.facturas?.numero_factura ?? '',
    monto_factura: h.facturas?.monto_total ?? 0,
    local_nombre: h.facturas?.locales?.nombre ?? '—',
    cupon_aplicado: h.cupon_aplicado ?? null,
    saldo_anterior: h.saldo_anterior,
    saldo_nuevo: h.saldo_nuevo,
    tickets_generados: h.tickets_generados,
    created_at: h.created_at,
  }));
}

export async function fetchSaldoPorCliente(clienteId: string): Promise<{
  saldos: Array<{ evento_id: string; evento_nombre: string; saldo: number; updated_at: string }>;
  historial: Array<{
    id: string;
    evento_nombre: string;
    numero_factura: string;
    monto_factura: number;
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
      .select('saldo, updated_at, eventos_campanas(id, nombre)')
      .eq('cliente_id', clienteId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('historial_saldo')
      .select('id, cupon_aplicado, saldo_anterior, saldo_nuevo, tickets_generados, created_at, eventos_campanas(nombre), facturas(numero_factura, monto_total)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false }),
  ]);

  if (saldosRes.error) throw saldosRes.error;
  if (historialRes.error) throw historialRes.error;

  return {
    saldos: ((saldosRes.data ?? []) as any[]).map((s) => ({
      evento_id: s.eventos_campanas?.id ?? '',
      evento_nombre: s.eventos_campanas?.nombre ?? '',
      saldo: s.saldo,
      updated_at: s.updated_at,
    })),
    historial: ((historialRes.data ?? []) as any[]).map((h) => ({
      id: h.id,
      evento_nombre: h.eventos_campanas?.nombre ?? '',
      numero_factura: h.facturas?.numero_factura ?? '',
      monto_factura: h.facturas?.monto_total ?? 0,
      cupon_aplicado: h.cupon_aplicado ?? null,
      saldo_anterior: h.saldo_anterior,
      saldo_nuevo: h.saldo_nuevo,
      tickets_generados: h.tickets_generados,
      created_at: h.created_at,
    })),
  };
}
