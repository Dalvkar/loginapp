# Base de datos del login

Esquema PostgreSQL gestionado con Prisma. Solo almacena hashes: `password_hash`
para contraseñas y `token_hash` para sesiones; nunca deben persistirse secretos en
texto plano.

## Decisiones

- Las claves primarias son UUID generados por PostgreSQL con
  `gen_random_uuid()`.
- Prisma usa nombres en camelCase y los mapea a tablas/columnas en snake_case.
- El correo es único y la migración exige que llegue normalizado con
  `lower(trim(email))`. El backend debe aplicar esa normalización antes de crear o
  buscar un usuario.
- Al eliminar un usuario, PostgreSQL elimina sus sesiones mediante `ON DELETE
  CASCADE`.
- `sessions.user_id` y `sessions.expires_at` tienen índices para resolver sesiones
  por usuario y limpiar sesiones vencidas.
- `updated_at` lo mantiene Prisma mediante `@updatedAt`; escrituras SQL directas
  deben actualizarlo explícitamente.

## Configuración y migración

Define `DATABASE_URL` sin guardar credenciales en el repositorio, por ejemplo:

```powershell
$env:DATABASE_URL = 'postgresql://USUARIO:CLAVE@localhost:5432/login_app?schema=public'
```

Desde el directorio del proyecto, con Prisma instalado por el backend:

```powershell
npx prisma validate --schema ./database/schema.prisma
npx prisma migrate deploy --schema ./database/schema.prisma
npx prisma generate --schema ./database/schema.prisma
```

En desarrollo, para que Prisma cree/aplique una migración nueva:

```powershell
npx prisma migrate dev --schema ./database/schema.prisma
```

## Verificación

```powershell
npx prisma validate --schema ./database/schema.prisma
npx prisma migrate status --schema ./database/schema.prisma
```

Comprueba también en PostgreSQL que existen `users`, `sessions`, sus claves
únicas, la relación con borrado en cascada y ambos índices de sesiones.

No se incluye un seed: crear un usuario requiere `bcryptjs` y debe pasar por la
misma política de hash y validación del backend. Cuando ese módulo esté listo,
puede exponerse un script que requiera `SEED_USER_EMAIL` y `SEED_USER_PASSWORD`,
rechace valores vacíos, normalice el correo y genere el hash antes de insertar.
Como alternativa segura, crea el primer usuario mediante el endpoint de registro
del backend.
