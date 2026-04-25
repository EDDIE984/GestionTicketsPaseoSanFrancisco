import { useState } from 'react';
import { CRUDTemplate } from '@/app/components/CRUDTemplate';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';

interface MetodoPago {
  id: number;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export function MetodosPagoCRUD() {
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([
    { id: 1, nombre: 'Tarjeta de Crédito', descripcion: 'Visa, Mastercard, Amex', activo: true },
    { id: 2, nombre: 'PayPal', descripcion: 'Pago mediante PayPal', activo: true },
    { id: 3, nombre: 'Transferencia Bancaria', descripcion: 'Transferencia directa', activo: false },
  ]);

  const handleAdd = (metodoPago: Omit<MetodoPago, 'id'>) => {
    const newMetodoPago = { ...metodoPago, id: Date.now() };
    setMetodosPago([...metodosPago, newMetodoPago]);
  };

  const handleEdit = (id: number, metodoPago: Partial<MetodoPago>) => {
    setMetodosPago(metodosPago.map((m) => (m.id === id ? { ...m, ...metodoPago } : m)));
  };

  const handleDelete = (id: number) => {
    setMetodosPago(metodosPago.filter((m) => m.id !== id));
  };

  const renderForm = (item: Partial<MetodoPago> | null, onChange: (field: keyof MetodoPago, value: any) => void) => (
    <>
      <div>
        <Label htmlFor="nombre">Nombre</Label>
        <Input
          id="nombre"
          defaultValue={item?.nombre || ''}
          onChange={(e) => onChange('nombre', e.target.value)}
          placeholder="Nombre del método de pago"
        />
      </div>
      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          defaultValue={item?.descripcion || ''}
          onChange={(e) => onChange('descripcion', e.target.value)}
          placeholder="Descripción del método de pago"
          rows={3}
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
      title="Métodos de Pago"
      description="Gestiona los métodos de pago disponibles"
      data={metodosPago}
      columns={[
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
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
