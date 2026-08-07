import { supabase } from '@/lib/supabase';
import type { EventoCampana, EventoCuponConfiguracion, EventoReglaCalculo } from '@/lib/types';

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
  evento_cupones: { cupon_id: string; metodo_pago_id: string | null }[];
  evento_entregables: { entregable_id: string }[];
  evento_reglas_calculo: Array<Omit<EventoReglaCalculo, 'local_ids'> & {
    evento_regla_locales: Array<{ local_id: string }>;
  }>;
};

function mapRawEvento(raw: RawEvento): EventoCampana {
  return {
    id: raw.id,
    nombre: raw.nombre,
    fecha_inicio: raw.fecha_inicio,
    fecha_fin: raw.fecha_fin,
    valor_minimo: raw.valor_minimo,
    valor_maximo: raw.valor_maximo,
    activo: raw.activo,
    created_at: raw.created_at,
    categoria_ids: raw.evento_categorias.map((r) => r.categoria_id),
    cupon_ids: raw.evento_cupones.map((r) => r.cupon_id),
    cupon_configuraciones: raw.evento_cupones.map((r) => ({
      cupon_id: r.cupon_id,
      metodo_pago_id: r.metodo_pago_id ?? '',
    })),
    entregable_ids: raw.evento_entregables.map((r) => r.entregable_id),
    reglas_calculo: (raw.evento_reglas_calculo ?? []).map((regla) => ({
      ...regla,
      local_ids: regla.evento_regla_locales?.map((item) => item.local_id) ?? [],
    })),
  };
}

export async function fetchEventos(): Promise<EventoCampana[]> {
  const { data, error } = await supabase
    .from('eventos_campanas')
    .select(`
      *,
      evento_categorias(categoria_id),
      evento_cupones(cupon_id, metodo_pago_id),
      evento_entregables(entregable_id),
      evento_reglas_calculo(id, categoria_id, aplica_todos, acumula_saldo, valor_minimo, valor_maximo, activo, evento_regla_locales(local_id))
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
  cupon_configuraciones: EventoCuponConfiguracion[];
  entregable_ids: string[];
  reglas_calculo: EventoReglaCalculo[];
}): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, cupon_configuraciones, entregable_ids, reglas_calculo, ...eventoData } = payload;

  const { data: evento, error } = await supabase
    .from('eventos_campanas')
    .insert(eventoData)
    .select()
    .single();
  if (error) throw error;

  await insertPivots(evento.id, categoria_ids, cupon_configuraciones, entregable_ids);
  await replaceReglas(evento.id, reglas_calculo);

  return {
    ...evento,
    categoria_ids,
    cupon_ids,
    cupon_configuraciones,
    entregable_ids,
    reglas_calculo,
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
    cupon_configuraciones?: EventoCuponConfiguracion[];
    entregable_ids?: string[];
    reglas_calculo?: EventoReglaCalculo[];
  }
): Promise<EventoCampana> {
  const { categoria_ids, cupon_ids, cupon_configuraciones, entregable_ids, reglas_calculo, ...eventoData } = payload;

  if (Object.keys(eventoData).length > 0) {
    const { error } = await supabase
      .from('eventos_campanas')
      .update(eventoData)
      .eq('id', id);
    if (error) throw error;
  }

  if (categoria_ids !== undefined) {
    const { error: delErr } = await supabase
      .from('evento_categorias')
      .delete()
      .eq('evento_id', id);
    if (delErr) throw delErr;
    if (categoria_ids.length > 0) {
      const { error: insErr } = await supabase
        .from('evento_categorias')
        .insert(categoria_ids.map((cid) => ({ evento_id: id, categoria_id: cid })));
      if (insErr) throw insErr;
    }
  }

  if (cupon_configuraciones !== undefined) {
    const { error: delErr } = await supabase
      .from('evento_cupones')
      .delete()
      .eq('evento_id', id);
    if (delErr) throw delErr;
    if (cupon_configuraciones.length > 0) {
      const { error: insErr } = await supabase
        .from('evento_cupones')
        .insert(cupon_configuraciones.map((config) => ({ evento_id: id, ...config })));
      if (insErr) throw insErr;
    }
  }

  if (entregable_ids !== undefined) {
    const { error: delErr } = await supabase
      .from('evento_entregables')
      .delete()
      .eq('evento_id', id);
    if (delErr) throw delErr;
    if (entregable_ids.length > 0) {
      const { error: insErr } = await supabase
        .from('evento_entregables')
        .insert(entregable_ids.map((eid) => ({ evento_id: id, entregable_id: eid })));
      if (insErr) throw insErr;
    }
  }

  if (reglas_calculo !== undefined) {
    await replaceReglas(id, reglas_calculo);
  }

  return fetchEventoById(id);
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
      evento_cupones(cupon_id, metodo_pago_id),
      evento_entregables(entregable_id),
      evento_reglas_calculo(id, categoria_id, aplica_todos, acumula_saldo, valor_minimo, valor_maximo, activo, evento_regla_locales(local_id))
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return mapRawEvento(data as RawEvento);
}

async function replaceReglas(eventoId: string, reglas: EventoReglaCalculo[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('evento_reglas_calculo')
    .delete()
    .eq('evento_id', eventoId);
  if (deleteError) throw deleteError;

  if (reglas.length === 0) return;
  for (const regla of reglas) {
    const { data: creada, error: insertError } = await supabase
      .from('evento_reglas_calculo')
      .insert({
        evento_id: eventoId,
        categoria_id: regla.categoria_id,
        aplica_todos: regla.aplica_todos,
        acumula_saldo: regla.acumula_saldo,
        valor_minimo: regla.valor_minimo,
        valor_maximo: regla.valor_maximo,
        activo: regla.activo,
      })
      .select('id')
      .single();
    if (insertError) throw insertError;

    if (!regla.aplica_todos && regla.local_ids.length > 0) {
      const { error: localesError } = await supabase
        .from('evento_regla_locales')
        .insert(regla.local_ids.map((localId) => ({ regla_id: creada.id, local_id: localId })));
      if (localesError) throw localesError;
    }
  }
}


async function insertPivots(
  eventoId: string,
  categoriaIds: string[],
  cuponConfiguraciones: EventoCuponConfiguracion[],
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
  if (cuponConfiguraciones.length > 0) {
    ops.push(
      supabase.from('evento_cupones').insert(
        cuponConfiguraciones.map((config) => ({ evento_id: eventoId, ...config }))
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
