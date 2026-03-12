---
name: TanStack Start Folder Architecture
description: Recommended folder structure and architectural guidelines for managing the TanStack Start App.
---

# TanStack Start Folder Architecture Guidelines

This skill defines the recommended folder structure, patterns, and conventions for developing applications within this TanStack Start project. Adhere to these guidelines to ensure consistency, scalable architecture, and maintainability.

## 📁 System Architecture At A Glance

Your application structure follows these conventions:

- **Framework**: TanStack Start v1 (React 19)
- **Styling**: Tailwind CSS v4, shadcn/ui
- **State/Forms**: @tanstack/react-form, Zod
- **Database**: Local JSON storage (via `db/` directory, e.g., `db/auth.json`)
- **Routing**: File-based routing via `src/routes/`

## 📂 Core Folder Structure

```text
/
├── db/                   # Local databases, JSON mock files, and persistence layer files
├── src/
│   ├── components/       # UI building blocks and composite view components
│   │   ├── ui/           # Automatically generated shadcn/ui components (do not edit directly unless needed)
│   │   └── ...           # Custom UI components grouped by feature/domain
│   ├── lib/              # Utility functions, helpers, types, and generic modules
│   ├── routes/           # TanStack Router file-based route definitions and route-level components
│   ├── server/           # Backend-specific server functions (`createServerFn`), RPCs, and APIs
│   ├── index.css         # Global Tailwind CSS entrypoint
│   └── router.tsx        # Application Router configuration and setup
└── ...
```

## 🏗️ Architectural Rules

### 1. 🛣️ Routing (`src/routes/`)

- **Convention**: Use TanStack Router's file-based routing conventions (`__root.tsx`, `index.tsx`, `[slug].tsx`).
- **Loaders**: Implement data loading locally inside the route files using `loader` options paired with server functions (`createServerFn`).
- **Validation**: Validate search parameters and route parameters heavily using `zod`.

### 2. 🖥️ Server Functions (`src/server/` or isolated files like `src/auth.ts`)

- **Convention**: For backend logic (Node.js/server context), utilize `createServerFn` imported from `@tanstack/react-start`.
- **Implementation**: Avoid putting complex backend logic directly in UI components or route views.
- **RPCs**: Use Server Functions to bridge frontend queries and mutations with backend data parsing.
- **Current Pattern**: User Authentication is currently orchestrated via `src/auth.ts` containing the `getUser`, `login`, `register`, and `logout` `createServerFn` actions.

### 3. 🧩 Components (`src/components/`)

- **Shadcn UI (`src/components/ui/`)**: Reusable UI components generated via the `shadcn` CLI.
- **Custom Components**: Build composite and business-logic-heavy components directly in `src/components/`. Keep them uncoupled from routes where possible to maximize reusability.
- **Styles**: Stick to Tailwind utility classes, grouped dynamically via `clsx` and `tailwind-merge` (`cn` utility in `src/lib/utils.ts`).

### 4. 🧰 Utils & Types (`src/lib/`)

- **Utils**: Store pure functions and formatting logic (like the `cn` utility) in `src/lib/`.
- **Typing**: Define shared typescript interfaces/types, or zod validation schemas that span server/client boundaries here.
- **Current Pattern**: Uses `~/*` and `@/*` mapping strictly to `./src/*`.

### 5. 💾 Database / Storage (`db/`)

- Keep non-tracked, persistent state separated from `src/`. Currently, the system uses file system paths (`db/auth.json`) for persistence mimicking a DB.
- Any direct filesystem modifications (`fs` operations) must strictly operate in server functions only, to avoid client-side bundling failures.

### 6. 🔐 Authentication & Session Management

- **Server Functions**: Sensitive authentication logic (login/logout/register) must be handled securely within `createServerFn` actions (e.g., `src/auth.ts`).
- **Session Management**: Utilize TanStack Start's secure HTTP-only cookie sessions (using `useSession` from `@tanstack/react-start/server` where applicable, or standard secure cookie manipulation) to track users.
- **Route Protection**: Protect authenticated routes using the `beforeLoad` property in route definitions. Redirect unauthenticated users using TanStack Router's `redirect` function.
- **Context**: Use React Context paired with `useServerFn(getCurrentUserFn)` to share authentication state and user details globally, avoiding redundant network requests.

## 🚀 Best Practices

1. **Imports**: Prefer absolute imports via the aliases `~/...` or `@/...` to avoid relative `../../../` hell. Both point to the `src/` directory.
2. **Server/Client boundary**: Clearly delineate server code from client code. Remember, TanStack Start parses exported `createServerFn` methods properly, but you cannot import `node:fs` directly into client views without wrapping it in a server function boundary.
3. **Forms**: Use `@tanstack/react-form` configured with Zod for robust client-side and server-side validation schemas.
4. **Icons**: Use `@phosphor-icons/react` and/or `lucide-react` directly in UI elements for consistency.

## Example Route with Server Function

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';

const myServerQuery = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Database or FileSystem logic here
    return { data: 'Success' };
  });

export const Route = createFileRoute('/example')({
  loader: async () => await myServerQuery(),
  component: ExampleView,
});

function ExampleView() {
  const data = Route.useLoaderData();
  return <div>{data.data}</div>;
}
```
