import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import type { Usuario } from '@/lib/types';
import { fetchUsuarios, createUsuario, updateUsuario, deleteUsuario } from '@/lib/api/usuarios';

interface UsuarioForm extends Omit<Usuario, 'password_hash' | 'created_at'> {
  password?: string;
}

export function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    fetchUsuarios().then(setUsuarios).catch(() => toast.error('Error al cargar usuarios'));
  }, []);

  const handleAdd = async (form: Omit<UsuarioForm, 'id'>) => {
    if (!form.password?.trim()) {
      toast.error('La contraseña es obligatoria');
      return;
    }
    try {
      const created = await createUsuario({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol as 'Admin' | 'Usuario',
        activo: form.activo ?? true,
      });
      setUsuarios((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el usuario');
    }
  };

  const handleEdit = async (id: string | number, form: Partial<UsuarioForm>) => {
    try {
      const updated = await updateUsuario(String(id), {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rol: form.rol as 'Admin' | 'Usuario' | undefined,
        activo: form.activo,
      });
      setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      toast.error('Error al actualizar el usuario');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteUsuario(String(id));
      setUsuarios((prev) => prev.filter((u) => u.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el usuario');
    }
  };

  const renderForm = (
    item: Partial<UsuarioForm> | null,
    onChange: (field: keyof UsuarioForm, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" defaultValue={item?.nombre || ''} onChange={(e) => onChange('nombre', e.target.value)} placeholder="Nombre del usuario" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" defaultValue={item?.email || ''} onChange={(e) => onChange('email', e.target.value)} placeholder="correo@ejemplo.com" />
      </div>
      <div>
        <Label htmlFor="password">
          Contraseña {item?.id ? '(dejar vacío para no cambiar)' : '*'}
        </Label>
        <Input id="password" type="password" onChange={(e) => onChange('password', e.target.value)} placeholder="••••••••" />
      </div>
      <div>
        <Label htmlFor="rol">Rol</Label>
        <Select defaultValue={item?.rol || 'Usuario'} onValueChange={(value) => onChange('rol', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Admin">Admin</SelectItem>
            <SelectItem value="Usuario">Usuario</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch id="activo" defaultChecked={item?.activo ?? true} onCheckedChange={(checked) => onChange('activo', checked)} />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Usuarios"
      description="Administra los usuarios del sistema"
      data={usuarios as any}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rol', label: 'Rol' },
        {
          key: 'activo', label: 'Estado',
          render: (item: any) => (
            <span className={`px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd as any}
      onEdit={handleEdit as any}
      onDelete={handleDelete}
      renderForm={renderForm as any}
      getItemId={(item: any) => item.id}
    />
  );
}
