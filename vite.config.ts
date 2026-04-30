import { defineConfig } from 'vite'
import path from 'path'
import { loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api/consulta-cedula': {
          target: 'http://nessoftfact-001-site6.atempurl.com',
          changeOrigin: true,
          rewrite: (proxyPath) => {
            const proxyUrl = new URL(proxyPath, 'http://localhost')
            const cedula = proxyUrl.searchParams.get('Cedula') ?? ''
            const apiUrl = new URL(
              env.CONSULTA_CEDULA_URL ??
                'http://nessoftfact-001-site6.atempurl.com/api/ConsultasDatos/ConsultaCedulaV2'
            )
            apiUrl.searchParams.set('Cedula', cedula)
            apiUrl.searchParams.set('Apikey', env.CONSULTA_CEDULA_API_KEY)
            return `${apiUrl.pathname}${apiUrl.search}`
          },
        },
      },
    },
  }
})
