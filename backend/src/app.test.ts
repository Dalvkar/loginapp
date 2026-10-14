import bcrypt from "bcryptjs";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import { CSRF_COOKIE, SESSION_COOKIE } from "./security.js";
import type { AuthStore, PublicUser, UserWithPassword } from "./types.js";

const config = {
  frontendUrl: "http://localhost:5173",
  port: 3000,
  sessionTtlHours: 24,
  isProduction: false,
};

function cookieFrom(response: Response, name: string): string {
  const value = response.headers.get("set-cookie")
    ?.split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .find((cookie) => cookie.trimStart().startsWith(`${name}=`))
    ?.split(";", 1)[0];

  if (!value) throw new Error(`No se encontro la cookie ${name}`);
  return value.trim();
}

describe("API de autenticacion", () => {
  let server: Server;
  let baseUrl: string;
  let store: AuthStore;
  let user: UserWithPassword;

  beforeEach(async () => {
    user = {
      id: "user-1",
      email: "ana@example.com",
      passwordHash: await bcrypt.hash("ClaveSegura123!", 4),
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    store = {
      findUserByEmail: vi.fn(async (email) => email === user.email ? user : null),
      createSession: vi.fn(async () => undefined),
      findUserBySessionHash: vi.fn(async () => null),
      deleteSessionByHash: vi.fn(async () => undefined),
    };

    server = createApp({ store, config }).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No se pudo iniciar el servidor de prueba");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  async function csrf(): Promise<{ token: string; cookie: string }> {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    const body = await response.json() as { csrfToken: string };
    return { token: body.csrfToken, cookie: cookieFrom(response, CSRF_COOKIE) };
  }

  it("entrega un token CSRF y su cookie correspondiente", async () => {
    const response = await fetch(`${baseUrl}/api/auth/csrf`);
    const body = await response.json() as { csrfToken: string };

    expect(response.status).toBe(200);
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookieFrom(response, CSRF_COOKIE)).toBe(`${CSRF_COOKIE}=${body.csrfToken}`);
  });

  it("rechaza el login cuando falta la proteccion CSRF", async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "ClaveSegura123!" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ message: "CSRF inválido" });
    expect(store.findUserByEmail).not.toHaveBeenCalled();
  });

  it("rechaza datos de login vacios o mal formados", async () => {
    const protection = await csrf();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: protection.cookie,
        "x-csrf-token": protection.token,
      },
      body: JSON.stringify({ email: "correo-invalido", password: "" }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Datos inválidos" });
    expect(store.findUserByEmail).not.toHaveBeenCalled();
  });

  it("responde de forma generica cuando las credenciales son incorrectas", async () => {
    const protection = await csrf();
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: protection.cookie,
        "x-csrf-token": protection.token,
      },
      body: JSON.stringify({ email: "desconocido@example.com", password: "Incorrecta123!" }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Credenciales inválidas" });
    expect(store.createSession).not.toHaveBeenCalled();
  });

  it("completa el ciclo login, consulta de sesion y logout", async () => {
    const protection = await csrf();
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: protection.cookie,
        "x-csrf-token": protection.token,
      },
      body: JSON.stringify({ email: "  ANA@example.com ", password: "ClaveSegura123!" }),
    });
    const sessionCookie = cookieFrom(loginResponse, SESSION_COOKIE);
    const publicUser: PublicUser = { id: user.id, email: user.email, createdAt: user.createdAt };
    vi.mocked(store.findUserBySessionHash).mockResolvedValueOnce(publicUser);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: sessionCookie },
    });
    const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        cookie: `${sessionCookie}; ${protection.cookie}`,
        "x-csrf-token": protection.token,
      },
    });

    expect(loginResponse.status).toBe(200);
    expect(await loginResponse.json()).toEqual({
      user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    });
    expect(store.findUserByEmail).toHaveBeenCalledWith("ana@example.com");
    expect(store.createSession).toHaveBeenCalledOnce();
    expect(meResponse.status).toBe(200);
    expect(await meResponse.json()).toEqual({ user: publicUserToJson(publicUser) });
    expect(logoutResponse.status).toBe(204);
    expect(store.deleteSessionByHash).toHaveBeenCalledOnce();
  });
});

function publicUserToJson(user: PublicUser) {
  return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
}
