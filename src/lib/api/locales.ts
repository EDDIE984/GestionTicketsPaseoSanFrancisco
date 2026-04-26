import { supabase } from '@/lib/supabase';
import type { Local } from '@/lib/types';

export async function fetchLocales(): Promise<Local[]> {
  const { data, error } = await supabase
    .from('locales')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createLocal(payload: Omit<Local, 'id'>): Promise<Local> {
  const { data, error } = await supabase
    .from('locales').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLocal(id: string, payload: Partial<Omit<Local, 'id'>>): Promise<Local> {
  const { data, error } = await supabase
    .from('locales').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLocal(id: string): Promise<void> {
  const { error } = await supabase.from('locales').delete().eq('id', id);
  if (error) throw error;
}
