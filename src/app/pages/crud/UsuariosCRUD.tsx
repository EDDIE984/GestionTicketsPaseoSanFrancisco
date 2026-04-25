import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export function UsuariosCRUD() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    { id: 1, nombre: 'Juan Pérez', email: 'juan@example.com', rol: 'Admin', activo: true },
    { id: 2, nombre: 'María García', email: 'maria@example.com', rol: 'Usuario', activo: true },
    { id: 3, nombre: 'Carlos López', email: 'carlos@example.com', rol: 'Usuario', activo: false },
  ]);

  const handleAdd = (usuario: Omit<Usuario, 'id'>) => {
    const newUsuario = { ...usuario, id: Date.now() };
    setUsuarios([...usuarios, newUsuario]);
  };

  const handleEdit = (id: number, usuario: Partial<Usuario>) => {
    setUsuarios(usuarios.map((u) => (u.id === id ? { ...u, ...usuario } : u)));
  };

  const handleDelete = (id: number) => {
    setUsuarios(usuarios.filter((u) => u.id !== id));
  };

  const renderForm = (item: Partial<Usuario> | null, onChange: (field: keyof Usuario, value: any) => void) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del usuario"
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          defaultValue={item?.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="correo@ejemplo.com"
        />
      </div>
      <div>
        <Label htmlFor="rol">Rol</Label>
        <Input
          id="rol"
          defaultValue={item?.rol || ''}
          onChange={(e) => onChange('rol', e.target.value)}
          placeholder="Admin, Usuario, etc."
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="activo"
          defaultChecked={item?.activo ?? true}
          onCheckedChange={(checked) => onChange('activo', checked)}
        />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Usuarios"
      description="Administra los usuarios del sistema"
      data={usuarios}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'rol', label: 'Rol' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {item.activo ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderForm={renderForm}
      getItemId={(item) => item.id}
    />
  );
}