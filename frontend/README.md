# Frontend del login

Interfaz React + TypeScript que consume la API de autenticación mediante cookies seguras y protección CSRF.

## Inicio

```bash
npm install
copy .env.example .env
npm run dev
```

La API se configura con `VITE_API_URL` y por defecto apunta a `http://localhost:3000`.

## Verificación

```bash
npm test
npm run lint
npm run build
```

La sesión se mantiene exclusivamente en la cookie HttpOnly enviada por el backend; no se usa almacenamiento local del navegador.
