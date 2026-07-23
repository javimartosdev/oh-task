# Oh-Task

Captura, organiza y enfócate. App de tareas tipo TickTick / Reminders.

- **Inbox · Hoy · Próximos · Listas** (carpetas + mover fácil)
- Calendario con sync Google
- Tema **Catppuccin** (Latte / Mocha)
- PWA en español

**Independiente de Habit Dock.** Repo propio, DB propia, deploy propio.

## Arranque local

```bash
cd ~/Projects/03_oh-task
docker compose up -d          # oh-task-db en puerto 5434
cp .env.example .env.local    # ajusta AUTH_SECRET
npm install
npm run db:push
npm run dev
```

Abre http://localhost:3000 → Inbox.

## Stack

Next.js 16 · TypeScript · Drizzle · PostgreSQL · NextAuth · Tailwind · Catppuccin

## Modelo Inbox

Cada usuario tiene una lista sistema **Inbox** (nombre `Inbox`). Las tareas sin lista o en Inbox aparecen en la vista Inbox. Al registrarse se crean Inbox, Personal y Trabajo.

## Deploy

Ver [DEPLOY.md](./DEPLOY.md).
