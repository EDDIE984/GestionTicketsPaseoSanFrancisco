import { supabase } from '@/lib/supabase';
import type { Factura, FacturaMetodoPago, FacturaVista } from '@/lib/types';

export async function createFactura(
  facturaData: Omit<Factura, 'id' | 'fecha_registro'>,
  metodosPago: Array<Omit<FacturaMetodoPago, 'id' | 'factura_id'>>
): Promise<Factura> {
  const { data: factura, error: facturaError } = await supabase
    .from('facturas')
    .insert(facturaData)
    .select()
    .single();
  if (facturaError) throw facturaError;

  if (metodosPago.length > 0) {
    const rows = metodosPago.map((m) => ({ ...m, factura_id: factura.id }));
    const { error: metodosError } = await supabase
      .from('factura_metodos_pago')
      .insert(rows);
    if (metodosError) throw metodosError;
  }

  return factura;
}

export async function fetchFacturasDelDia(): Promise<FacturaVista[]> {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('facturas')
    .select(`
      *,
      clientes(*),
      eventos_campanas(nombre, valor_minimo),
      locales(nombre),
      usuarios(nombre, email),
      factura_metodos_pago(
        *,
        metodos_pago(nombre),
        cupones(nombre)
      )
    `)
    .gte('fecha_registro', `${today}T00:00:00`)
    .lt('fecha_registro', `${tomorrow}T00:00:00`)
    .order('fecha_registro', { ascending: false });

  if (error) throw error;
  return data as FacturaVista[];
}

export async function fetchEventosActivos() {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      id, nombre, valor_minimo, valor_maximo, activo,
      evento_cupones(cupon_id, cupones(id, nombre, numero))
    `)
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return data as Array<{
    id: string;
    nombre: string;
    valor_minimo: number;
    valor_maximo: number;
    activo: boolean;
    evento_cupones: Array<{
      cupon_id: string;
      cupones: { id: string; nombre: string; numero: number };
    }>;
  }>;
}
