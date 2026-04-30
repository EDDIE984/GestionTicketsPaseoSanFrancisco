import { useNavigate } from 'react-router';
import { Users, Tag, Store, Ticket, Package, CreditCard, Calendar, SlidersHorizontal, Printer } from 'lucide-react';

interface ConfigCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

function ConfigCard({ title, description, icon: Icon, path }: ConfigCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(path)}
      className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg mb-2 text-gray-900 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function ConfigDashboard() {
  const configSections = [
    {
      title: 'Usuarios',
      description: 'Administra usuarios del sistema',
      icon: Users,
      path: '/configuracion/usuarios',
    },
    {
      title: 'Categorías',
      description: 'Gestiona las categorías de eventos',
      icon: Tag,
      path: '/configuracion/categorias',
    },
    {
      title: 'Locales Comerciales',
      description: 'Administra los locales comerciales',
      icon: Store,
      path: '/configuracion/locales',
    },
    {
      title: 'Cupones',
      description: 'Gestiona cupones de descuento',
      icon: Ticket,
      path: '/configuracion/cupones',
    },
    {
      title: 'Entregables',
      description: 'Administra productos entregables',
      icon: Package,
      path: '/configuracion/entregables',
    },
    {
      title: 'Métodos de Pago',
      description: 'Gestiona los métodos de pago disponibles',
      icon: CreditCard,
      path: '/configuracion/metodos-pago',
    },
    {
      title: 'Eventos/Campañas',
      description: 'Administra eventos y campañas del sistema',
      icon: Calendar,
      path: '/configuracion/eventos-campanas',
    },
    {
      title: 'Parametrizaciones',
      description: 'Configura los datos para el envío de correo',
      icon: SlidersHorizontal,
      path: '/configuracion/parametrizaciones',
    },
    {
      title: 'Impresora POS',
      description: 'Consulta la consola local, cola y prueba la ticketera',
      icon: Printer,
      path: '/configuracion/impresora-pos',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl mb-2 text-gray-900">Configuración</h1>
        <p className="text-gray-600">
          Administra los diferentes aspectos del sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configSections.map((section) => (
          <ConfigCard key={section.path} {...section} />
        ))}
      </div>
    </div>
  );
}
