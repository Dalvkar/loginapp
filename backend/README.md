# Backend

1. Copia `.env.example` como `.env` y configura PostgreSQL.
2. Ejecuta `npm install` y `npm run prisma:generate`.
3. Aplica migraciones con `npm run prisma:deploy`.
4. Inicia con `npm run dev`.

El frontend debe usar `credentials: "include"`. Antes de login/logout obtiene `/api/auth/csrf` y envía el token en `x-csrf-token`.
