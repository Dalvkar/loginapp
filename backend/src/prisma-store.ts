import { PrismaClient } from "@prisma/client";
import type { AuthStore, PublicUser, UserWithPassword } from "./types.js";

export class PrismaAuthStore implements AuthStore {
  constructor(private readonly prisma: PrismaClient) {}
  findUserByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, passwordHash: true, isActive: true, createdAt: true } });
  }
  async createSession(input: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void> {
    await this.prisma.session.create({ data: input });
  }
  findUserBySessionHash(tokenHash: string, now: Date): Promise<PublicUser | null> {
    return this.prisma.user.findFirst({ where: { isActive: true, sessions: { some: { tokenHash, expiresAt: { gt: now } } } }, select: { id: true, email: true, createdAt: true } });
  }
  async deleteSessionByHash(tokenHash: string): Promise<void> { await this.prisma.session.deleteMany({ where: { tokenHash } }); }
}
