import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { MetodoPago } from '@/lib/types';
import { fetchMetodosPago, createMetodoPago, updateMetodoPago, deleteMetodoPago } from '@/lib/api/metodos-pago';

export function MetodosPagoCRUD() {
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);

  useEffect(() => {
    fetchMetodosPago()
      .then(setMetodosPago)
      .catch(() => toast.error('Error al cargar métodos de pago'));
  }, []);

  const handleAdd = async (metodoPago: Omit<MetodoPago, 'id'>) => {
    try {
      const created = await createMetodoPago(metodoPago);
      setMetodosPago((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el método de pago');
    }
  };

  const handleEdit = async (id: string | number, metodoPago: Partial<MetodoPago>) => {
    try {
      const updated = await updateMetodoPago(String(id), metodoPago);
      setMetodosPago((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } catch {
      toast.error('Error al actualizar el método de pago');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMetodoPago(String(id));
      setMetodosPago((prev) => prev.filter((m) => m.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el método de pago');
    }
  };

  const renderForm = (
    item: Partial<MetodoPago> | null,
    onChange: (field: keyof MetodoPago, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" defaultValue={item?.nombre || ''} onChange={(e) => onChange('nombre', e.target.value)} placeholder="Nombre del método de pago" />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea id="descripcion" defaultValue={item?.descripcion || ''} onChange={(e) => onChange('descripcion', e.target.value)} placeholder="Descripción" rows={3} />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="activo" defaultChecked={item?.activo ?? true} onCheckedChange={(checked) => onChange('activo', checked)} />
        <Label htmlFor="activo">Activo</Label>
      </div>
    </>
  );

  return (
    <CRUDTemplate
      title="Métodos de Pago"
      description="Gestiona los métodos de pago disponibles"
      data={metodosPago}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
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
