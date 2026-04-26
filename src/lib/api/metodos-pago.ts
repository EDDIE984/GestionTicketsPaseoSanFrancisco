import { supabase } from '@/lib/supabase';
import type { MetodoPago } from '@/lib/types';

export async function fetchMetodosPago(): Promise<MetodoPago[]> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createMetodoPago(
  payload: Omit<MetodoPago, 'id'>
): Promise<MetodoPago> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMetodoPago(
  id: string,
  payload: Partial<Omit<MetodoPago, 'id'>>
): Promise<MetodoPago> {
  const { data, error } = await supabase
    .from('metodos_pago')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMetodoPago(id: string): Promise<void> {
  const { error } = await supabase.from('metodos_pago').delete().eq('id', id);
  if (error) throw error;
}
