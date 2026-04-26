import { supabase } from '@/lib/supabase';
import type { Entregable } from '@/lib/types';

export async function fetchEntregables(): Promise<Entregable[]> {
  const { data, error } = await supabase
    .from('entregables')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createEntregable(
  payload: Omit<Entregable, 'id'>
): Promise<Entregable> {
  const { data, error } = await supabase
    .from('entregables')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntregable(
  id: string,
  payload: Partial<Omit<Entregable, 'id'>>
): Promise<Entregable> {
  const { data, error } = await supabase
    .from('entregables')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntregable(id: string): Promise<void> {
  const { error } = await supabase.from('entregables').delete().eq('id', id);
  if (error) throw error;
}
