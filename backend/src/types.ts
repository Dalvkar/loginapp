export interface PublicUser { id: string; email: string; createdAt: Date }
export interface UserWithPassword extends PublicUser { passwordHash: string; isActive: boolean }
export interface AuthStore {
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  createSession(input: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void>;
  findUserBySessionHash(tokenHash: string, now: Date): Promise<PublicUser | null>;
  deleteSessionByHash(tokenHash: string): Promise<void>;
}
