# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm i          # Install dependencies
npm run dev    # Start development server (Vite)
npm run build  # Production build
```

There is no test suite configured in this project.

## Architecture

This is a **React + TypeScript SPA** (Vite + Tailwind v4) for a ticket/event management system called *Sistema de Control de Tickets*. All data is currently held in component-level `useState` — there is no backend or persistent storage.

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
| `/registro` | `Registro` |
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
