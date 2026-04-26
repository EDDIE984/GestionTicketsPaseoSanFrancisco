import { useState } from 'react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { sha256 } from '@/lib/hash';
import { findUsuarioByEmail } from '@/lib/api/usuarios';
import type { AuthUser } from '@/app/components/AuthContext';
import logoUrl from '@/images/LogoPSFBlanco.svg';

export function Login({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const usuario = await findUsuarioByEmail(email.trim());
      if (!usuario) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      const hash = await sha256(password.trim());
      if (hash !== usuario.password_hash) {
        setError('Correo o contraseña incorrectos');
        return;
      }

      onLogin({
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      });
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #1e3a5f 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#2563eb' }} />
        <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-10" style={{ background: '#2563eb' }} />
        <div className="relative z-10 flex flex-col items-center gap-8 px-12 text-center">
          <img src={logoUrl} alt="Logo" className="w-64 drop-shadow-lg" />
          <div className="space-y-2">
            <h1 className="text-white text-2xl font-semibold tracking-wide">
              Sistema de Control de Tickets
            </h1>
            <p className="text-slate-400 text-sm">Gestión integral de Tickets</p>
          </div>
        </div>
      </div>

      {/* Panel derecho */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div
            className="flex md:hidden items-center justify-center rounded-xl py-6"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
          >
            <img src={logoUrl} alt="Logo" className="w-48" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-gray-900">Bienvenido</h2>
            <p className="text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-base font-medium"
              style={{ background: '#2563eb' }}
            >
              {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400">
            © 2022 PaseoSanFrancisco · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
