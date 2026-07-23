# Deploy — Oh-Task (Vercel + Neon)

Publicar **Oh-Task** (repo `javimartosdev/oh-task`). Usa una **base Neon nueva** — nunca la de Habit Dock.

## Requisitos

- GitHub: [javimartosdev/oh-task](https://github.com/javimartosdev/oh-task)
- [Neon](https://neon.tech) — proyecto Postgres nuevo (EU)
- [Vercel](https://vercel.com) — importar este repo

---

## 1. Neon

1. Crea proyecto Neon dedicado a Oh-Task.
2. Copia connection string con `?sslmode=require`.
3. Empuja el esquema:

```bash
cd ~/Projects/03_oh-task
DATABASE_URL='postgres://…?sslmode=require' npm run db:push
```

4. (Opcional) Invite:

```bash
DATABASE_URL='…' bash scripts/seed-invite.sh amigos
# En Vercel: INVITE_ONLY=1
```

---

## 2. Secretos Vercel

```bash
openssl rand -base64 32
```

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Neon Oh-Task (no Habit Dock) |
| `AUTH_SECRET` | Sesión |
| `AUTH_URL` | URL https pública |
| `INVITE_ONLY` | `1` para cerrar registro |
| `GOOGLE_CLIENT_ID` | OAuth Google Calendar |
| `GOOGLE_CLIENT_SECRET` | OAuth Google Calendar |

### Google Calendar setup

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs → habilita **Google Calendar API**
2. Credenciales OAuth 2.0 (app web)
3. Authorized redirect URI: `https://TU-DOMINIO/api/calendar/sync/callback`
4. Scopes usados: `https://www.googleapis.com/auth/calendar.events`
5. Local: `http://localhost:3000/api/calendar/sync/callback`

Stripe / R2: opcionales; Pro está aparcado en la UI.

---

## 3. Deploy

1. vercel.com/new → Import **oh-task**
2. Framework Next.js · env vars Production
3. Deploy → actualiza `AUTH_URL` → redeploy

```bash
npx vercel login
npx vercel --prod
```

---

## 4. Comprobar

- `/register` (+ invite si aplica)
- Inbox → captura NLP (`Comprar leche mañana a las 10`)
- Hoy / Próximos / Listas (carpetas, Mover, drag)
- Cal + Google sync en Ajustes
- `/install` → PWA iPhone

---

## 5. Checklist amigo

1. Generar código en Ajustes → Invitaciones
2. Enviar código
3. Amigo: `/register` con email + código
4. (Opcional) `/install` en Safari
