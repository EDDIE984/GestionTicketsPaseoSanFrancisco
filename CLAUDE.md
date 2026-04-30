# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm i                                           # Install dependencies
npm run dev                                     # Start development server (Vite frontend only)
npm run build                                   # Production build
npm run test:correo -- correo@dominio.com       # Test active SMTP configuration from terminal
npx vercel dev                                  # Run frontend plus Vercel serverless /api functions locally
```

There is no test suite configured in this project.

## Architecture

This is a **React + TypeScript SPA** (Vite + Tailwind v4) for a ticket/event management system called *Sistema de Control de Tickets*. Persistent data lives in Supabase through API helpers under `src/lib/api/`. Server-side operations that must not expose secrets live in Vercel functions under `api/`.

### Routing (`src/app/App.tsx`)

All routes are nested under `<Layout />`:

| Path | Component |
|---|---|
| `/` | `Dashboard` |
| `/configuracion` | `ConfigDashboard` — grid of cards linking to CRUD pages |
| `/configuracion/usuarios` | `UsuariosCRUD` |
| `/configuracion/categorias` | `CategoriasCRUD` |
| `/configuracion/locales` | `LocalesCRUD` |
| `/configuracion/cupones` | `CuponesCRUD` |
| `/configuracion/entregables` | `EntregablesCRUD` |
| `/configuracion/metodos-pago` | `MetodosPagoCRUD` |
| `/configuracion/eventos-campanas` | `EventosCampanas` |
| `/configuracion/parametrizaciones` | `Parametrizaciones` — SMTP/email settings |
| `/registro` | `Registro` |
| `/consentimiento/:token` | `Consentimiento` — public consent form sent by email |
| `/reporteria` | `Reporteria` |
| `/trafico` | `Trafico` |

### Key components

- **`Layout`** (`src/app/components/Layout.tsx`) — collapsible dark sidebar with online/offline indicator, renders `<Outlet />` as main content.
- **`CRUDTemplate<T>`** (`src/app/components/CRUDTemplate.tsx`) — generic table + add/edit dialog + delete confirmation. All CRUD pages under `src/app/pages/crud/` use this template; pass `columns`, `data`, `onAdd`, `onEdit`, `onDelete`, `renderForm`, and `getItemId`.

### UI library

Components in `src/app/components/ui/` are **shadcn/ui** wrappers over Radix UI primitives. Import from `@/app/components/ui/<component>`. Do not modify these files unless extending a component; add new shadcn components there using the same pattern.

### Path alias

`@` maps to `src/` (configured in `vite.config.ts`). Always use `@/` imports rather than relative paths.

### Styles

CSS entry point is `src/styles/index.css`, which imports `fonts.css`, `tailwind.css`, and `theme.css`. Tailwind v4 is used via the `@tailwindcss/vite` plugin — no `tailwind.config` file exists; utility classes are resolved automatically.

## Supabase

The app uses Supabase from `src/lib/supabase.ts` with public frontend variables:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Serverless functions use a service role key. This key is secret and must never be exposed with a `VITE_` prefix:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
APP_URL=http://localhost:5173
```

For Vercel production, set the same server-side variables in Vercel Project Settings. `APP_URL` should be the deployed app URL.

Database SQL files:

- `supabase_schema.sql` — full schema.
- `supabase_parametrizaciones_correo.sql` — incremental table for SMTP/email settings.
- `supabase_formularios_consentimiento.sql` — incremental table for consent links and acceptance.

## Email Configuration And Testing

Email settings are managed in `/configuracion/parametrizaciones` and stored in the `parametrizaciones_correo` table.

Known working SMTP configuration for `onewayec.com`:

```txt
Servidor SMTP: mail.onewayec.com
Puerto SMTP: 465
Seguridad: SSL
```

Do not use port `993` for SMTP. Port `993` is IMAP SSL for receiving mail. If used with Nodemailer it fails with an IMAP greeting such as `IMAP4rev1 ... Dovecot ready`.

To test email without Vercel or the browser, use the terminal script:

```bash
npm run test:correo -- edison.sosa@onewayec.com
```

The script:

1. Loads `.env`.
2. Uses `SUPABASE_SERVICE_ROLE_KEY` to read the active `parametrizaciones_correo` row.
3. Verifies SMTP connection with Nodemailer.
4. Sends a test email.
5. Prints the full technical error if SMTP fails.

Successful output looks like:

```txt
Consultando parametrización activa...
SMTP: mail.onewayec.com:465 (ssl)
Verificando conexión SMTP...
Enviando correo de prueba...
Correo enviado correctamente.
Message ID: <...@onewayec.com>
```

The UI button **Probar correo** calls `/api/probar-correo`. That route only exists when running through Vercel serverless functions. In local development:

- `npm run dev` starts Vite only, so `/api/probar-correo` returns HTTP 404.
- `npx vercel dev` starts both the frontend and `/api` functions.

## Consent Flow

When invoices are registered in `Registro`, the app groups pending invoices by client and sends one consent email per client. If the client already has `fecha_aceptacion`, no email is sent.

The consent link points to:

```txt
/consentimiento/:token
```

Links expire after 7 days. The public form displays the client name, email, and phone, with two checkboxes selected by default:

- Advertising consent, optional and can be unchecked.
- Data protection policy acceptance, required.

The policy PDF URL is:

```txt
https://paseosanfrancisco.ec/wp-content/uploads/2026/03/politica-tratamiento-datos-paseo-act-1.pdf
```

Serverless functions involved:

- `api/probar-correo.js` — SMTP test.
- `api/enviar-consentimiento.js` — sends consent email after invoice registration.
- `api/consentimiento.js` — reads/saves consent form by token.
- `api/consulta-cedula.js` — proxy for cedula lookup to avoid browser CORS.
