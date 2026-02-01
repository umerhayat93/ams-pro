import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedOwner() {
  // Check if owner exists by username
  const existing = await db.select().from(users).where(eq(users.username, "umer"));
  
  if (existing.length === 0) {
    const hashedPassword = await hashPassword("rehan055");
    await db.insert(users).values({
      username: "umer",
      password: hashedPassword,
      role: "superuser",
      name: "Super Admin",
    });
    console.log("Superuser account created: umer / rehan055");
  } else {
    console.log("Superuser account already exists, skipping seed.");
  }
}
