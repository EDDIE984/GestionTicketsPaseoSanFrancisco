import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Cupon } from '@/lib/types';
import { fetchCupones, createCupon, updateCupon, deleteCupon } from '@/lib/api/cupones';

export function CuponesCRUD() {
  const [cupones, setCupones] = useState<Cupon[]>([]);

  useEffect(() => {
    fetchCupones()
      .then(setCupones)
      .catch(() => toast.error('Error al cargar cupones'));
  }, []);

  const handleAdd = async (cupon: Omit<Cupon, 'id'>) => {
    try {
      const created = await createCupon(cupon);
      setCupones((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el cupón');
    }
  };

  const handleEdit = async (id: string | number, cupon: Partial<Cupon>) => {
    try {
      const updated = await updateCupon(String(id), cupon);
      setCupones((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      toast.error('Error al actualizar el cupón');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteCupon(String(id));
      setCupones((prev) => prev.filter((c) => c.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el cupón');
    }
  };

  const renderForm = (
    item: Partial<Cupon> | null,
    onChange: (field: keyof Cupon, value: any) => void
  ) => (
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
        <Label htmlFor="numero">Número (multiplicador)</Label>
        <Input
          id="numero"
          type="number"
          defaultValue={item?.numero ?? ''}
          onChange={(e) => onChange('numero', parseInt(e.target.value) || 0)}
          placeholder="1"
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
        { key: 'numero', label: 'Multiplicador' },
        {
          key: 'activo',
          label: 'Estado',
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