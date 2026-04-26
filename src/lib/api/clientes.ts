import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

export async function upsertCliente(
  data: Omit<Cliente, 'id' | 'created_at'>
): Promise<Cliente> {
  const { data: existing } = await supabase
    .from('clientes')
    .select('*')
    .eq('cedula', data.cedula)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from('clientes')
      .update({
        nombre: data.nombre,
        apellido: data.apellido,
        direccion: data.direccion,
        telefono: data.telefono,
        correo: data.correo,
        genero: data.genero,
      })
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
