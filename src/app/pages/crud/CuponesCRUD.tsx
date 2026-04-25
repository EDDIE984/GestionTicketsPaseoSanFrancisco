import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';

interface Cupon {
  id: number;
  nombre: string;
  numero: number;
  activo: boolean;
}

export function CuponesCRUD() {
  const [cupones, setCupones] = useState<Cupon[]>([
    { id: 1, nombre: 'Dinners triple cupon', numero: 3, activo: true },
    { id: 2, nombre: 'Cupon doble descuento', numero: 2, activo: true },
    { id: 3, nombre: 'Mega cupon premium', numero: 5, activo: true },
    { id: 4, nombre: 'Cupon simple', numero: 1, activo: true },
    { id: 5, nombre: 'Cupon familiar', numero: 4, activo: true },
    { id: 6, nombre: 'Cupon especial navidad', numero: 10, activo: false },
    { id: 7, nombre: 'Cupon fin de semana', numero: 2, activo: true },
    { id: 8, nombre: 'Cupon aniversario', numero: 7, activo: true },
  ]);

  const handleAdd = (cupon: Omit<Cupon, 'id'>) => {
    const newCupon = { ...cupon, id: Date.now() };
    setCupones([...cupones, newCupon]);
  };

  const handleEdit = (id: number, cupon: Partial<Cupon>) => {
    setCupones(cupones.map((c) => (c.id === id ? { ...c, ...cupon } : c)));
  };

  const handleDelete = (id: number) => {
    setCupones(cupones.filter((c) => c.id !== id));
  };

  const renderForm = (item: Partial<Cupon> | null, onChange: (field: keyof Cupon, value: any) => void) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del cupón"
        />
      </div>
      <div>
        <Label htmlFor="numero">Número</Label>
        <Input
          id="numero"
          type="number"
          defaultValue={item?.numero || ''}
          onChange={(e) => onChange('numero', parseInt(e.target.value) || 0)}
          placeholder="Número del cupón"
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
      title="Cupones"
      description="Administra los cupones del sistema"
      data={cupones}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'numero', label: 'Número' },
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