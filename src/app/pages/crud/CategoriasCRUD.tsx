import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';

interface Categoria {
  id: number;
  nombre: string;
  activo: boolean;
}

export function CategoriasCRUD() {
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 1, nombre: 'Accesorios', activo: true },
    { id: 2, nombre: 'Autos', activo: true },
    { id: 3, nombre: 'Bancos', activo: true },
    { id: 4, nombre: 'Entretenimiento', activo: true },
    { id: 5, nombre: 'Familiar', activo: true },
    { id: 6, nombre: 'Farmacias', activo: true },
    { id: 7, nombre: 'Ferreterías', activo: true },
    { id: 8, nombre: 'Retail', activo: true },
  ]);

  const handleAdd = (categoria: Omit<Categoria, 'id'>) => {
    const newCategoria = { ...categoria, id: Date.now() };
    setCategorias([...categorias, newCategoria]);
  };

  const handleEdit = (id: number, categoria: Partial<Categoria>) => {
    setCategorias(categorias.map((c) => (c.id === id ? { ...c, ...categoria } : c)));
  };

  const handleDelete = (id: number) => {
    setCategorias(categorias.filter((c) => c.id !== id));
  };

  const renderForm = (item: Partial<Categoria> | null, onChange: (field: keyof Categoria, value: any) => void) => (
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