import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface Local {
  id: number;
  nombre: string;
  activo: boolean;
  categoriaId: number;
}

// Categorías disponibles en el sistema
const CATEGORIAS = [
  { id: 1, nombre: 'Accesorios' },
  { id: 2, nombre: 'Autos' },
  { id: 3, nombre: 'Bancos' },
  { id: 4, nombre: 'Entretenimiento' },
  { id: 5, nombre: 'Familiar' },
  { id: 6, nombre: 'Farmacias' },
  { id: 7, nombre: 'Ferreterías' },
  { id: 8, nombre: 'Retail' },
];

export function LocalesCRUD() {
  const [locales, setLocales] = useState<Local[]>([
    { id: 1, nombre: '3500 Restaurante', activo: true, categoriaId: 4 },
    { id: 2, nombre: 'AutoMax', activo: true, categoriaId: 2 },
    { id: 3, nombre: 'Banco Nacional', activo: true, categoriaId: 3 },
    { id: 4, nombre: 'Farmacia Salud', activo: true, categoriaId: 6 },
    { id: 5, nombre: 'Ferretería El Constructor', activo: true, categoriaId: 7 },
    { id: 6, nombre: 'Moda y Estilo', activo: true, categoriaId: 1 },
    { id: 7, nombre: 'SuperMercado Familiar', activo: true, categoriaId: 5 },
    { id: 8, nombre: 'Tienda Retail Plus', activo: true, categoriaId: 8 },
  ]);

  const handleAdd = (local: Omit<Local, 'id'>) => {
    const newLocal = { ...local, id: Date.now() };
    setLocales([...locales, newLocal]);
  };

  const handleEdit = (id: number, local: Partial<Local>) => {
    setLocales(locales.map((l) => (l.id === id ? { ...l, ...local } : l)));
  };

  const handleDelete = (id: number) => {
    setLocales(locales.filter((l) => l.id !== id));
  };

  const getCategoriaNombre = (categoriaId: number) => {
    const categoria = CATEGORIAS.find((c) => c.id === categoriaId);
    return categoria?.nombre || 'Sin categoría';
  };

  const renderForm = (item: Partial<Local> | null, onChange: (field: keyof Local, value: any) => void) => (
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
          defaultValue={item?.categoriaId?.toString()}
          onValueChange={(value) => onChange('categoriaId', parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map((categoria) => (
              <SelectItem key={categoria.id} value={categoria.id.toString()}>
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
          key: 'categoriaId',
          label: 'Categoría',
          render: (item) => getCategoriaNombre(item.categoriaId),
        },
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