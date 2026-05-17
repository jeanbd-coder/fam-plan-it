# Golden Family Task List

A shared, lightweight task tracker for a family. Everyone signs in with Google, sees the same list, can assign tasks to anyone, set due dates, and check things off.

## Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, file-based routing) running in SPA mode
- **Build:** Vite 7 + TypeScript
- **Styling:** Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) (Radix primitives)
- **Data:** [React Query](https://tanstack.com/query) + [Supabase](https://supabase.com) (Postgres with Row-Level Security)
- **Auth:** Supabase email + password (sign-in, sign-up, password reset)
- **Deploy:** [Vercel](https://vercel.com) (static SPA)
- **Package manager:** Bun (a `package-lock.json` is also present for npm)

## Routes

| Path               | File                              | Purpose                                                       |
| ------------------ | --------------------------------- | ------------------------------------------------------------- |
| `/`                | `src/routes/index.tsx`            | Dashboard: add, assign, complete, filter, and delete tasks    |
| `/login`           | `src/routes/login.tsx`            | Email + password sign-in / sign-up, "forgot password" entry   |
| `/reset-password`  | `src/routes/reset-password.tsx`   | Landing page for the password-reset email link                |

## Data model

Two tables in Supabase (`supabase/migrations/`):

- **`profiles`** — one row per family member, auto-created from `auth.users` via the `handle_new_user` trigger. Pulls `display_name` and `avatar_url` from Google.
- **`tasks`** — `title`, `assigned_to` (nullable FK to a profile), `due_date`, `done`, `created_by`, timestamps.

Row-Level Security:

- All authenticated users can read both tables.
- Any authenticated user can create or update a task.
- Only the creator or assignee can delete a task.
- A user can only insert/update their own profile.

## Getting started

```bash
bun install         # or: npm install
bun run dev         # vite dev server
```

Open the printed URL (the Lovable Vite preset listens on `http://localhost:8080`).

### Environment

Copy `.env.example` to `.env` and fill in the values from your Supabase project (Supabase dashboard → Settings → API):

```
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon / publishable key>"
VITE_SUPABASE_PROJECT_ID="<project-ref>"
```

These are read by the browser at build time. `.env` is gitignored.

### Database

The schema lives in two places:

- `supabase/setup.sql` — a single consolidated script. **Easiest for a fresh project**: paste it into the Supabase dashboard's SQL Editor and run.
- `supabase/migrations/` — the same schema as ordered migration files, for use with the Supabase CLI:

  ```bash
  supabase link --project-ref <your-project-ref>
  supabase db push
  ```

### Supabase auth settings

In the Supabase dashboard:

- Enable the **Email** provider under Authentication → Providers.
- Decide whether to require email confirmation. If on, new sign-ups will see a "Check your inbox" screen until they click the link.
- Add `<your-app-origin>/reset-password` to **Authentication → URL Configuration → Redirect URLs** so the password-reset email link is allowed.

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `bun run dev`      | Start the Vite dev server                     |
| `bun run build`    | Production build                              |
| `bun run build:dev`| Build in development mode                     |
| `bun run preview`  | Preview the production build locally          |
| `bun run lint`     | Run ESLint                                    |
| `bun run format`   | Run Prettier across the repo                  |

## Deployment

The app deploys as a **static SPA on Vercel**. `vercel.json` sets the build command, output directory (`dist/client`), and a catch-all rewrite to `_shell.html` so client-side routes work on deep links.

```bash
# one-time setup
bun add -g vercel
vercel login
vercel link

# add the three Supabase env vars (production + preview + development)
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
vercel env add VITE_SUPABASE_PROJECT_ID

# deploy
vercel             # preview deploy
vercel --prod      # production deploy
```

If the repo is connected to Vercel via GitHub, pushes to `main` deploy automatically — you only need to set the env vars in the dashboard once.

## Project layout

```
src/
  routes/             # File-based routes (TanStack Router)
    __root.tsx        # Root layout, meta, error/404 boundaries
    index.tsx         # Dashboard
    login.tsx         # Sign-in / sign-up / forgot password
    reset-password.tsx # Set a new password after clicking the email link
  components/ui/      # shadcn/ui components
  hooks/              # useAuth, etc.
  integrations/
    supabase/         # Supabase client + auth middleware
  lib/                # Shared utilities (cn, etc.)
  router.tsx          # Router factory
  server.ts           # SSR/worker entry
  start.ts            # TanStack Start instance
  styles.css          # Tailwind entry + design tokens
supabase/
  migrations/         # Schema (profiles + tasks, RLS, triggers)
```

`src/routeTree.gen.ts` is generated by `@tanstack/router-plugin` — do not edit by hand.
