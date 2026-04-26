import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Entregable } from '@/lib/types';
import { fetchEntregables, createEntregable, updateEntregable, deleteEntregable } from '@/lib/api/entregables';

export function EntregablesCRUD() {
  const [entregables, setEntregables] = useState<Entregable[]>([]);

  useEffect(() => {
    fetchEntregables()
      .then(setEntregables)
      .catch(() => toast.error('Error al cargar entregables'));
  }, []);

  const handleAdd = async (entregable: Omit<Entregable, 'id'>) => {
    try {
      const created = await createEntregable(entregable);
      setEntregables((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el entregable');
    }
  };

  const handleEdit = async (id: string | number, entregable: Partial<Entregable>) => {
    try {
      const updated = await updateEntregable(String(id), entregable);
      setEntregables((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch {
      toast.error('Error al actualizar el entregable');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteEntregable(String(id));
      setEntregables((prev) => prev.filter((e) => e.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el entregable');
    }
  };

  const renderForm = (
    item: Partial<Entregable> | null,
    onChange: (field: keyof Entregable, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" defaultValue={item?.nombre || ''} onChange={(e) => onChange('nombre', e.target.value)} placeholder="Nombre del producto" />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" defaultValue={item?.descripcion || ''} onChange={(e) => onChange('descripcion', e.target.value)} placeholder="Descripción del producto" rows={3} />
      </div>
      <div>
        <Label htmlFor="stock">Stock</Label>
        <Input id="stock" type="number" defaultValue={item?.stock ?? ''} onChange={(e) => onChange('stock', parseInt(e.target.value) || 0)} placeholder="0" />
      </div>
      <div>
        <Label htmlFor="precio_base">Precio Base</Label>
        <Input id="precio_base" type="number" step="0.01" defaultValue={item?.precio_base ?? ''} onChange={(e) => onChange('precio_base', parseFloat(e.target.value) || 0)} placeholder="0.00" />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="activo" defaultChecked={item?.activo ?? true} onCheckedChange={(checked) => onChange('activo', checked)} />
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
        { key: 'precio_base', label: 'Precio Base', render: (item) => `$${(item.precio_base ?? 0).toFixed(2)}` },
        {
          key: 'activo', label: 'Estado',
          render: (item) => (
            <span className={`px-2 py-1 rounded-full text-xs ${item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
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