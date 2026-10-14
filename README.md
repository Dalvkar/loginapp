# Login fullstack

Aplicacion de login con React, Express, PostgreSQL y Prisma.

## Usuario local de demostracion

- Correo: `demo@ejemplo.com`
- Contrasena: `Demo12345!`

Estas credenciales son solo para desarrollo local y pueden cambiarse con
`SEED_USER_EMAIL` y `SEED_USER_PASSWORD` antes de ejecutar `npm run seed`.

## Servicios

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- PostgreSQL: localhost:5432

## Pruebas y automatizacion

Ejecuta todas las pruebas desde esta carpeta:

```bash
npm test
```

GitHub Actions repite las pruebas y la compilacion en cada `push` y `pull request`.
Para activar el hook local, ejecuta una vez dentro de un repositorio Git:

```bash
npm run hooks:install
```

El hook ejecuta la suite antes de cada `push`. Si encuentra la falla conocida y
segura del mensaje de validacion, ejecuta `scripts/repair-known-test-failure.mjs`
y vuelve a correr todas las pruebas. Si la falla es distinta o persiste, bloquea
el `push` en vez de modificar codigo desconocido.
