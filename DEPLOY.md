# Deploy — Vercel + Neon

Guía para publicar Habit Dock en internet y usarla en el iPhone como PWA.

## Requisitos

- Cuenta en [GitHub](https://github.com) (repo: `javimartosdev/habit-dock`)
- Cuenta en [Neon](https://neon.tech) (Postgres gratis)
- Cuenta en [Vercel](https://vercel.com) (plan Hobby gratis)

---

## 1. Base de datos en Neon

1. Crea un proyecto en Neon (región EU si vives en España).
2. Copia la **connection string** con SSL.
3. Guárdala en `.env.production.local` (no lo subas a Git).
4. Sincroniza el esquema:

```bash
cd ~/Projects/01_habit-dock
export $(grep -v '^#' .env.production.local | xargs)
npm run db:push
```

5. (Opcional) Código de invitación:

```bash
DATABASE_URL=... bash scripts/seed-invite.sh amigos
# INVITE_ONLY=1 en Vercel si quieres cerrar el registro
```

---

## 2. Secretos para producción

```bash
openssl rand -base64 32
```

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Neon con `?sslmode=require` |
| `AUTH_SECRET` | Secreto de sesión |
| `AUTH_URL` | URL pública https |
| `INVITE_ONLY` | `1` para exigir invite |
| `GOOGLE_*` / `OUTLOOK_*` | Sync calendarios |
| `R2_*` | Adjuntos |
| `STRIPE_*` | Billing Pro |

---

## 3. Deploy en Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `habit-dock`
2. Framework: Next.js
3. Añade las env vars (Production)
4. Deploy
5. Actualiza `AUTH_URL` con la URL real y redeploy

CLI:

```bash
npx vercel login
npx vercel --prod
```

Webhook Stripe: `https://tu-app.vercel.app/api/billing/webhook`

---

## 4. Comprobar

- `/register`, hábitos, tasks (NLP: `Comprar leche mañana a las 10`)
- `/tasks`, `/calendar`, `/focus`, `/matrix`, `/gantt`, `/stats`, `/settings`
- `/install` → PWA en iPhone (Safari)

---

## 5. Actualizar

```bash
git push origin main
```

Vercel redeploya si el repo está conectado.

---

## Problemas frecuentes

| Síntoma | Solución |
|---------|----------|
| Error 500 al login | `DATABASE_URL` + `db:push` en Neon |
| Sesión no persiste | `AUTH_URL` = URL pública exacta |
| Columnas nuevas faltan | `npm run db:push` otra vez |
| PWA iPhone | Safari → Añadir a pantalla de inicio |
