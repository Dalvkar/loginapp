import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import type { AppConfig } from "./config.js";
import { CSRF_COOKIE, hashToken, randomToken, SESSION_COOKIE, tokensEqual } from "./security.js";
import type { AuthStore, PublicUser } from "./types.js";

const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(1024) }).strict();
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.30bB7L8kT7YuvQ9Y2IhAqC1Yfmq9KjK";
const wrap = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => { void handler(req, res, next).catch(next); };
const userJson = (u: PublicUser) => ({ id: u.id, email: u.email, createdAt: u.createdAt.toISOString() });

export function createApp({ store, config }: { store: AuthStore; config: AppConfig }) {
  const app = express();
  const baseCookie = { secure: config.isProduction, sameSite: "lax" as const, path: "/" };
  const sessionMaxAge = config.sessionTtlHours * 3_600_000;
  app.disable("x-powered-by"); app.use(helmet());
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: "16kb" })); app.use(cookieParser());

  const csrf = (req: Request, res: Response, next: NextFunction) => {
    if (!tokensEqual(req.cookies?.[CSRF_COOKIE], req.header("x-csrf-token"))) { res.status(403).json({ message: "CSRF inválido" }); return; }
    next();
  };
  app.get("/api/auth/csrf", (_req, res) => {
    const csrfToken = randomToken();
    res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookie, httpOnly: false }).status(200).json({ csrfToken });
  });
  const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ message: "Demasiados intentos. Inténtalo más tarde" }) });
  app.post("/api/auth/login", limiter, csrf, wrap(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Datos invalidos" }); return; }
    const user = await store.findUserByEmail(parsed.data.email);
    const matches = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.isActive || !matches) { res.status(401).json({ message: "Credenciales inválidas" }); return; }
    const token = randomToken();
    await store.createSession({ tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + sessionMaxAge) });
    res.cookie(SESSION_COOKIE, token, { ...baseCookie, httpOnly: true, maxAge: sessionMaxAge }).status(200).json({ user: userJson(user) });
  }));
  app.get("/api/auth/me", wrap(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === "string" ? await store.findUserBySessionHash(hashToken(token), new Date()) : null;
    if (!user) { res.status(401).json({ message: "No autenticado" }); return; }
    res.status(200).json({ user: userJson(user) });
  }));
  app.post("/api/auth/logout", csrf, wrap(async (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string") await store.deleteSessionByHash(hashToken(token));
    res.clearCookie(SESSION_COOKIE, { ...baseCookie, httpOnly: true }).status(204).send();
  }));
  app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada" }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error no controlado", error); res.status(500).json({ message: "Error interno del servidor" });
  });
  return app;
}
