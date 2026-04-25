import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';

interface Entregable {
  id: number;
  nombre: string;
  descripcion: string;
  stock: number;
  precioBase: number;
  activo: boolean;
}

export function EntregablesCRUD() {
  const [entregables, setEntregables] = useState<Entregable[]>([
    { id: 1, nombre: 'Camiseta Oficial', descripcion: 'Camiseta del evento', stock: 100, precioBase: 25.99, activo: true },
    { id: 2, nombre: 'Gorra', descripcion: 'Gorra con logo', stock: 50, precioBase: 15.99, activo: true },
    { id: 3, nombre: 'Kit', descripcion: 'Kit completo del evento', stock: 75, precioBase: 100, activo: true },
    { id: 4, nombre: 'Ticket', descripcion: 'Ticket de entrada', stock: 200, precioBase: 40, activo: true },
  ]);

  const handleAdd = (entregable: Omit<Entregable, 'id'>) => {
    const newEntregable = { ...entregable, id: Date.now() };
    setEntregables([...entregables, newEntregable]);
  };

  const handleEdit = (id: number, entregable: Partial<Entregable>) => {
    setEntregables(entregables.map((e) => (e.id === id ? { ...e, ...entregable } : e)));
  };

  const handleDelete = (id: number) => {
    setEntregables(entregables.filter((e) => e.id !== id));
  };

  const renderForm = (item: Partial<Entregable> | null, onChange: (field: keyof Entregable, value: any) => void) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del producto"
        />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          defaultValue={item?.descripcion || ''}
          onChange={(e) => onChange('descripcion', e.target.value)}
          placeholder="Descripción del producto"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          defaultValue={item?.stock || ''}
          onChange={(e) => onChange('stock', parseInt(e.target.value))}
          placeholder="Cantidad disponible"
        />
      </div>
      <div>
        <Label htmlFor="precioBase">Precio Base</Label>
        <Input
          id="precioBase"
          type="number"
          step="0.01"
          defaultValue={item?.precioBase || ''}
          onChange={(e) => onChange('precioBase', parseFloat(e.target.value))}
          placeholder="0.00"
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
      title="Entregables"
      description="Administra productos entregables"
      data={entregables}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'stock', label: 'Stock' },
        { key: 'precioBase', label: 'Precio Base', render: (item) => `$${item.precioBase.toFixed(2)}` },
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