import { supabase } from '@/lib/supabase';
import type { Cupon } from '@/lib/types';

export async function fetchCupones(): Promise<Cupon[]> {
  const { data, error } = await supabase
    .from('cupones')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createCupon(payload: Omit<Cupon, 'id'>): Promise<Cupon> {
  const { data, error } = await supabase
    .from('cupones')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCupon(
  id: string,
  payload: Partial<Omit<Cupon, 'id'>>
): Promise<Cupon> {
  const { data, error } = await supabase
    .from('cupones')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCupon(id: string): Promise<void> {
  const { error } = await supabase.from('cupones').delete().eq('id', id);
  if (error) throw error;
}
