import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import type { Categoria } from '@/lib/types';
import {
  fetchCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
} from '@/lib/api/categorias';

export function CategoriasCRUD() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchCategorias()
      .then(setCategorias)
      .catch(() => toast.error('Error al cargar categorías'));
  }, []);

  const handleAdd = async (categoria: Omit<Categoria, 'id'>) => {
    try {
      const created = await createCategoria(categoria);
      setCategorias((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear la categoría');
    }
  };

  const handleEdit = async (id: string | number, categoria: Partial<Categoria>) => {
    try {
      const updated = await updateCategoria(String(id), categoria);
      setCategorias((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch {
      toast.error('Error al actualizar la categoría');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteCategoria(String(id));
      setCategorias((prev) => prev.filter((c) => c.id !== String(id)));
    } catch {
      toast.error('Error al eliminar la categoría');
    }
  };

  const renderForm = (
    item: Partial<Categoria> | null,
    onChange: (field: keyof Categoria, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre de la categoría"
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
      title="Categorías"
      description="Gestiona las categorías de eventos"
      data={categorias}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        {
          key: 'activo',
          label: 'Estado',
          render: (item) => (
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                item.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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