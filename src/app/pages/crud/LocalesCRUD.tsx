import { useState, useEffect } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { toast } from 'sonner';
import type { Local, Categoria } from '@/lib/types';
import { fetchLocales, createLocal, updateLocal, deleteLocal } from '@/lib/api/locales';
import { fetchCategorias } from '@/lib/api/categorias';

export function LocalesCRUD() {
  const [locales, setLocales] = useState<Local[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    fetchLocales().then(setLocales).catch(() => toast.error('Error al cargar locales'));
    fetchCategorias().then(setCategorias).catch(() => toast.error('Error al cargar categorías'));
  }, []);

  const getCategoriaNombre = (categoriaId: string) =>
    categorias.find((c) => c.id === categoriaId)?.nombre || 'Sin categoría';

  const handleAdd = async (local: Omit<Local, 'id'>) => {
    try {
      const created = await createLocal(local);
      setLocales((prev) => [...prev, created]);
    } catch {
      toast.error('Error al crear el local');
    }
  };

  const handleEdit = async (id: string | number, local: Partial<Local>) => {
    try {
      const updated = await updateLocal(String(id), local);
      setLocales((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      toast.error('Error al actualizar el local');
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteLocal(String(id));
      setLocales((prev) => prev.filter((l) => l.id !== String(id)));
    } catch {
      toast.error('Error al eliminar el local');
    }
  };

  const renderForm = (
    item: Partial<Local> | null,
    onChange: (field: keyof Local, value: any) => void
  ) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del local comercial"
        />
      </div>
      <div>
        <Label htmlFor="categoria">Categoría</Label>
        <Select
          defaultValue={item?.categoria_id}
          onValueChange={(value) => onChange('categoria_id', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias.filter((c) => c.activo).map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      title="Locales Comerciales"
      description="Administra los locales comerciales"
      data={locales}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        {
          key: 'categoria_id',
          label: 'Categoría',
          render: (item) => getCategoriaNombre(item.categoria_id),
        },
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
