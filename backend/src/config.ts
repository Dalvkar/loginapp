import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1), FRONTEND_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(720).default(24),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});
export type AppConfig = { frontendUrl: string; port: number; sessionTtlHours: number; isProduction: boolean };
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = schema.safeParse(environment);
  if (!result.success) throw new Error(`Configuración inválida: ${z.prettifyError(result.error)}`);
  return { frontendUrl: result.data.FRONTEND_URL, port: result.data.PORT,
    sessionTtlHours: result.data.SESSION_TTL_HOURS, isProduction: result.data.NODE_ENV === "production" };
}
