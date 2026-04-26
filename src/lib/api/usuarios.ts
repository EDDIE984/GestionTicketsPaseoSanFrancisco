import { supabase } from '@/lib/supabase';
import { sha256 } from '@/lib/hash';
import type { Usuario } from '@/lib/types';

export async function fetchUsuarios(): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nombre, email, rol, activo, created_at')
    .order('nombre');
  if (error) throw error;
  return data as Usuario[];
}

export async function createUsuario(payload: {
  nombre: string;
  email: string;
  password: string;
  rol: 'Admin' | 'Usuario';
  activo: boolean;
}): Promise<Usuario> {
  const password_hash = await sha256(payload.password);
  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nombre: payload.nombre,
      email: payload.email,
      password_hash,
      rol: payload.rol,
      activo: payload.activo,
    })
    .select('id, nombre, email, rol, activo, created_at')
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function updateUsuario(
  id: string,
  payload: {
    nombre?: string;
    email?: string;
    password?: string;
    rol?: 'Admin' | 'Usuario';
    activo?: boolean;
  }
): Promise<Usuario> {
  const updates: Record<string, any> = { ...payload };
  delete updates.password;
  if (payload.password && payload.password.trim() !== '') {
    updates.password_hash = await sha256(payload.password);
  }
  const { data, error } = await supabase
    .from('usuarios')
    .update(updates)
    .eq('id', id)
    .select('id, nombre, email, rol, activo, created_at')
    .single();
  if (error) throw error;
  return data as Usuario;
}

export async function deleteUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) throw error;
}

export async function findUsuarioByEmail(
  email: string
): Promise<(Usuario & { password_hash: string }) | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('activo', true)
    .single();
  if (error) return null;
  return data;
}
