import { supabase } from '@/lib/supabase';
import type { EventoCampana } from '@/lib/types';

type RawEvento = {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  created_at: string;
  evento_categorias: { categoria_id: string }[];
  evento_cupones: { cupon_id: string }[];
  evento_entregables: { entregable_id: string }[];
};

function mapRawEvento(raw: RawEvento): EventoCampana {
  return {
    ...raw,
    categoria_ids: raw.evento_categorias.map((r) => r.categoria_id),
    cupon_ids: raw.evento_cupones.map((r) => r.cupon_id),
    entregable_ids: raw.evento_entregables.map((r) => r.entregable_id),
  };
}

export async function fetchEventos(): Promise<EventoCampana[]> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      *,
      evento_categorias(categoria_id),
      evento_cupones(cupon_id),
      evento_entregables(entregable_id)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as RawEvento[]).map(mapRawEvento);
}

export async function createEvento(payload: {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  valor_minimo: number;
  valor_maximo: number;
  activo: boolean;
  categoria_ids: string[];
  cupon_ids: string[];
  entregable_ids: string[];
}): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, entregable_ids, ...eventoData } = payload;

  const { data: evento, error } = await supabase
    .from('eventos_campanas')
    .insert(eventoData)
    .select()
    .single();
  if (error) throw error;

  await insertPivots(evento.id, categoria_ids, cupon_ids, entregable_ids);

  return {
    ...evento,
    categoria_ids,
    cupon_ids,
    entregable_ids,
  };
}

export async function updateEvento(
  id: string,
  payload: {
    nombre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    valor_minimo?: number;
    valor_maximo?: number;
    activo?: boolean;
    categoria_ids?: string[];
    cupon_ids?: string[];
    entregable_ids?: string[];
  }
): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, entregable_ids, ...eventoData } = payload;

  const { data: evento, error } = await supabase
    .from('eventos_campanas')
    .update(eventoData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  if (categoria_ids !== undefined || cupon_ids !== undefined || entregable_ids !== undefined) {
    await deletePivots(id);
    await insertPivots(
      id,
      categoria_ids ?? [],
      cupon_ids ?? [],
      entregable_ids ?? []
    );
  }

  const updated = await fetchEventoById(id);
  return updated;
}

export async function deleteEvento(id: string): Promise<void> {
  // Las tablas pivote tienen ON DELETE CASCADE, se eliminan automáticamente
  const { error } = await supabase.from('eventos_campanas').delete().eq('id', id);
  if (error) throw error;
}

async function fetchEventoById(id: string): Promise<EventoCampana> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      *,
      evento_categorias(categoria_id),
      evento_cupones(cupon_id),
      evento_entregables(entregable_id)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapRawEvento(data as RawEvento);
}

async function deletePivots(eventoId: string): Promise<void> {
  await Promise.all([
    supabase.from('evento_categorias').delete().eq('evento_id', eventoId),
    supabase.from('evento_cupones').delete().eq('evento_id', eventoId),
    supabase.from('evento_entregables').delete().eq('evento_id', eventoId),
  ]);
}

async function insertPivots(
  eventoId: string,
  categoriaIds: string[],
  cuponIds: string[],
  entregableIds: string[]
): Promise<void> {
  const ops: Promise<any>[] = [];
  if (categoriaIds.length > 0) {
    ops.push(
      supabase.from('evento_categorias').insert(
        categoriaIds.map((id) => ({ evento_id: eventoId, categoria_id: id }))
      )
    );
  }
  if (cuponIds.length > 0) {
    ops.push(
      supabase.from('evento_cupones').insert(
        cuponIds.map((id) => ({ evento_id: eventoId, cupon_id: id }))
      )
    );
  }
  if (entregableIds.length > 0) {
    ops.push(
      supabase.from('evento_entregables').insert(
        entregableIds.map((id) => ({ evento_id: eventoId, entregable_id: id }))
      )
    );
  }
  await Promise.all(ops);
}
