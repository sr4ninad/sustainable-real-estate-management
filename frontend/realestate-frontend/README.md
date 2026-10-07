# Verdant — frontend

React 19 + Vite app for the Sustainable Real Estate Management System. See the root README for setup.

```bash
npm install
npm run dev      # http://localhost:5173 (backend must be running on :8080)
npm run lint
npm run build
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | `http://localhost:8080` | Where the dev server proxies `/api` |
| `VITE_API_URL` | *(empty)* | Call a backend on another origin directly instead of through the proxy |
| `VITE_ADMIN_CONSOLE_URL` | `http://localhost:8080/` | Link to the Thymeleaf admin console (admins) |
| `VITE_SHOW_DEMO_LOGINS` | `true` | Show one-click demo accounts on the sign-in page |

## How it's organised

```
src/
  lib/          api client, formatting, domain helpers, role permissions
  context/      AuthProvider (session + role), DataProvider (tables + reload), toasts & confirm dialog
  layout/       AppShell (sidebar, account card), CommandPalette (Ctrl/⌘ K), role-aware nav
  components/   ui primitives, DataTable (sort + pages), Modal/Drawer (focus trap), charts, forms
  pages/        one file per route, loaded on demand
  styles/       tokens (light/dark), components, layout, pages
```

Every page checks the signed-in user's permissions (`useAuth().can`) to decide which actions to show.
The backend enforces the same rules, so hiding a button is never the only protection.
