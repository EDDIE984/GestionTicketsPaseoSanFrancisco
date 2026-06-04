import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

export async function fetchClienteByCedula(cedula: string): Promise<Cliente | null> {
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cedula', cedula)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertCliente(
  data: Omit<Cliente, 'id' | 'created_at'>
): Promise<Cliente> {
  const existing = await fetchClienteByCedula(data.cedula);

  if (existing) {
    const cambios = {
      nombre: data.nombre,
      apellido: data.apellido,
      direccion: data.direccion,
      telefono: data.telefono,
      correo: data.correo,
      genero: data.genero,
    };
    const tieneCambios = Object.entries(cambios).some(
      ([key, value]) => existing[key as keyof typeof cambios] !== value
    );

    if (!tieneCambios) return existing;

    const { data: updated, error } = await supabase
      .from('clientes')
      .update(cambios)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  const { data: created, error } = await supabase
    .from('clientes')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return created;
}
