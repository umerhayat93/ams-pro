import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const [, , username, newPassword] = process.argv;
  if (!username || !newPassword) {
    console.error("Usage: npx tsx scripts/reset-user-password.ts <username> <newPassword>");
    process.exit(1);
  }

  try {
    const hashed = await hashPassword(newPassword);
    await db.update(users).set({ password: hashed }).where(eq(users.username, username));
    console.log(`Password for user '${username}' updated successfully.`);
    process.exit(0);
  } catch (err: any) {
    console.error("Failed to update password:", err?.message || err);
    process.exit(1);
  }
}

main();
