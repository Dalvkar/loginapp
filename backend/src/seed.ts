import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = (process.env.SEED_USER_EMAIL ?? "demo@ejemplo.com").trim().toLowerCase();
const password = process.env.SEED_USER_PASSWORD ?? "Demo12345!";

if (!email || password.length < 8) {
  throw new Error("El usuario de demostracion requiere email y una clave de al menos 8 caracteres");
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash },
  });
  console.log(`Usuario de demostracion listo: ${email}`);
} finally {
  await prisma.$disconnect();
}
