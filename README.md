# Oh-Task

Captura, organiza y enfócate. Tareas, calendario, hábitos y modo foco.

Tema visual: **Catppuccin** (Latte claro / Mocha oscuro).

## Arranque

```bash
cd ~/Projects/01_habit-dock
docker start study-dock-db   # o: docker compose up -d
cp .env.example .env.local
npm run db:push
npm run dev
```

## Stack

Next.js 16 · TypeScript · Drizzle · PostgreSQL · NextAuth · Tailwind · Catppuccin

## Deploy

Ver [DEPLOY.md](./DEPLOY.md).
