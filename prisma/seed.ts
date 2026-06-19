import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcryptjs from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaLibSQL({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const prisma = new PrismaClient({ adapter });

function generateStrongPassword(): string {
  // 24 chars URL-safe base64 — fuerte y memorable solo una vez
  return randomBytes(18).toString("base64").replace(/[+/=]/g, "").slice(0, 24);
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@maxipiso.com";
  const envPassword = process.env.ADMIN_PASSWORD;

  // En producción exigimos password fuerte explícita
  if (process.env.NODE_ENV === "production" && (!envPassword || envPassword.length < 12)) {
    throw new Error(
      "ADMIN_PASSWORD obligatorio (mín 12 chars) en producción. Aborto seed.",
    );
  }

  const adminPassword = envPassword && envPassword.length >= 12
    ? envPassword
    : generateStrongPassword();

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin user already exists");
    return;
  }

  const hashedPassword = await bcryptjs.hash(adminPassword, 12);

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Admin MaxiPiso",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created successfully");
  console.log(`📧 Email: ${adminUser.email}`);
  console.log(`🔑 Password (mostrada UNA sola vez): ${adminPassword}`);
  console.log("⚠️  Guardala en un gestor de contraseñas. NO la vas a volver a ver.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
