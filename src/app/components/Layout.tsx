import { useState, useEffect } from 'react';
import { useLocation, Link, Outlet } from 'react-router';
import { Menu, Settings, ClipboardList, BarChart3, TrendingUp, Database } from 'lucide-react';
import logo from '@/images/LogoPSFBlanco.svg';

export function Layout({ user, logout }: { user: any; logout: () => void }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Menú según rol
  let menuItems = [];
  if (user?.rol === 'Admin') {
    menuItems = [
      { path: '/configuracion', label: 'Configuración', icon: Settings },
      { path: '/registro', label: 'Registro', icon: ClipboardList },
      { path: '/reporteria', label: 'Reportería', icon: BarChart3 },
      { path: '/trafico', label: 'Tráfico', icon: TrendingUp },
    ];
  } else {
    menuItems = [
      { path: '/registro', label: 'Registro', icon: ClipboardList },
    ];
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex flex-col shadow-xl relative overflow-hidden`}
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)' }}
      >
        {/* Patrón de puntos */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Círculos decorativos */}
        <div
          className="absolute -top-16 -left-16 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: '#2563eb' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: '#2563eb' }}
        />

        {/* Logo Header */}
        <div className="relative z-10 h-28 border-b border-white/10 flex items-center justify-between px-4">
          {isSidebarOpen ? (
            <img
              src={logo}
              alt="Logo"
              className="h-20 w-auto object-contain"
            />
          ) : (
            <div className="w-8" />
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="relative z-10 flex-1 p-3 mt-2">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`${!isSidebarOpen && 'hidden'} text-sm font-medium`}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="relative z-10 border-t border-white/10 px-4 py-4">
          <div className={`flex items-center gap-2 ${!isSidebarOpen && 'hidden'}`}>
            <Database
              className={`w-3.5 h-3.5 flex-shrink-0 ${
                isOnline ? 'text-green-400' : 'text-red-400'
              }`}
            />
            <p className="text-xs text-white/30">Ticket System v1.0</p>
          </div>
          <div className={`flex items-center gap-2 mt-2 ${!isSidebarOpen && 'hidden'}`}>
            <span className="text-xs text-white/50">{user?.nombre} ({user?.rol})</span>
            <button
              onClick={logout}
              className="text-xs text-red-400 hover:text-red-300 hover:underline ml-2 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}