import { supabase } from '@/lib/supabase';

export type TipoTrafico = 'peatonal';

export interface TraficoIngresoDiario {
  id: string;
  fecha: string;
  tipo: TipoTrafico;
  anio: number;
  mes: number;
  dia: number;
  cantidad: number;
  fuente_archivo: string | null;
  uploaded_at: string;
}

export interface TraficoIngresoUpsert {
  fecha: string;
  tipo: TipoTrafico;
  anio: number;
  mes: number;
  dia: number;
  cantidad: number;
  fuente_archivo?: string;
  uploaded_at?: string;
}

export async function fetchTraficoIngresos(): Promise<TraficoIngresoDiario[]> {
  const pageSize = 1000;
  const rows: TraficoIngresoDiario[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('trafico_ingresos_diarios')
      .select('*')
      .order('fecha', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as TraficoIngresoDiario[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function upsertTraficoIngresos(rows: TraficoIngresoUpsert[]) {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('trafico_ingresos_diarios')
    .upsert(rows, { onConflict: 'fecha,tipo' })
    .select();

  if (error) throw error;
  return (data ?? []) as TraficoIngresoDiario[];
}
