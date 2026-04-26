import { supabase } from '@/lib/supabase';
import type { Categoria } from '@/lib/types';

export async function fetchCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre');
  if (error) throw error;
  return data;
}

export async function createCategoria(
  payload: Omit<Categoria, 'id'>
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategoria(
  id: string,
  payload: Partial<Omit<Categoria, 'id'>>
): Promise<Categoria> {
  const { data, error } = await supabase
    .from('categorias')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw error;
}
