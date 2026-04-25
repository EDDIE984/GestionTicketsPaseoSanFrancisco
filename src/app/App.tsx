import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { GlobalToaster } from '@/app/components/GlobalToaster';
import { Layout } from '@/app/components/Layout';
import { Dashboard } from '@/app/pages/Dashboard';
import { ConfigDashboard } from '@/app/pages/ConfigDashboard';
import { UsuariosCRUD } from '@/app/pages/crud/UsuariosCRUD';
import { CategoriasCRUD } from '@/app/pages/crud/CategoriasCRUD';
import { LocalesCRUD } from '@/app/pages/crud/LocalesCRUD';
import { CuponesCRUD } from '@/app/pages/crud/CuponesCRUD';
import { EntregablesCRUD } from '@/app/pages/crud/EntregablesCRUD';
import { MetodosPagoCRUD } from '@/app/pages/crud/MetodosPagoCRUD';
import { EventosCampanas } from '@/app/pages/EventosCampanas';
import { Registro } from '@/app/pages/Registro';
import { Reporteria } from '@/app/pages/Reporteria';
import { Trafico } from '@/app/pages/Trafico';
import { Login } from '@/app/pages/Login';
import { useAuth } from '@/app/components/AuthContext';
import { useState } from 'react';

export default function App() {
  const { user, login, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <Login onLogin={login} />;
  }

  // Rutas para admin
  const adminRoutes = (
    <Route path="/" element={<Layout logout={logout} user={user} />}>
      <Route index element={<Dashboard />} />
      <Route path="configuracion" element={<ConfigDashboard />} />
      <Route path="configuracion/usuarios" element={<UsuariosCRUD />} />
      <Route path="configuracion/categorias" element={<CategoriasCRUD />} />
      <Route path="configuracion/locales" element={<LocalesCRUD />} />
      <Route path="configuracion/cupones" element={<CuponesCRUD />} />
      <Route path="configuracion/entregables" element={<EntregablesCRUD />} />
      <Route path="configuracion/metodos-pago" element={<MetodosPagoCRUD />} />
      <Route path="configuracion/eventos-campanas" element={<EventosCampanas />} />
      <Route path="registro" element={<Registro />} />
      <Route path="eventos" element={<Navigate to="/configuracion/eventos-campanas" replace />} />
      <Route path="reporteria" element={<Reporteria />} />
      <Route path="trafico" element={<Trafico />} />
    </Route>
  );

  // Rutas para usuario normal
  const userRoutes = (
    <Route path="/" element={<Layout logout={logout} user={user} />}>
      <Route index element={<Navigate to="/registro" replace />} />
      <Route path="registro" element={<Registro />} />
      <Route path="*" element={<Navigate to="/registro" replace />} />
    </Route>
  );

  return (
    <>
      <GlobalToaster />
      <BrowserRouter>
        <Routes>
          {user.rol === 'Admin' ? adminRoutes : userRoutes}
        </Routes>
      </BrowserRouter>
    </>
  );
}