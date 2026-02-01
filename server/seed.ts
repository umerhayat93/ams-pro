import { db } from "./db";
import { users, shops, inventory, customers } from "@shared/schema";
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

  // Seed customer
  const existingCustomer = await db.select().from(users).where(eq(users.username, "nk1234"));
  if (existingCustomer.length === 0) {
    const hashedPassword = await hashPassword("nk123123");
    await db.insert(users).values({
      username: "nk1234",
      password: hashedPassword,
      role: "customer",
      name: "Test Customer",
    });
    console.log("Customer account created: nk1234 / nk123123");
  } else {
    console.log("Customer account already exists, skipping seed.");
  }

  // Seed Shop and Inventory (for testing POS)
  const owner = await db.select().from(users).where(eq(users.username, "umer")).then(res => res[0]);
  if (owner) {
    const existingShop = await db.select().from(shops).where(eq(shops.ownerId, owner.id));
    if (existingShop.length === 0) {
      const [shop] = await db.insert(shops).values({
        name: "Umer's Mobile Shop",
        location: "Downtown",
        address: "123 Main St",
        phone: "555-0101",
        ownerId: owner.id,
      }).returning();
      console.log("Shop created: Umer's Mobile Shop");

      // Add Inventory
      await db.insert(inventory).values([
        {
          shopId: shop.id,
          brand: "Apple",
          model: "iPhone 13",
          storage: "128GB",
          ram: "4GB",
          color: "Midnight",
          quantity: 10,
          buyingPrice: "700",
          sellingPrice: "800",
        },
        {
          shopId: shop.id,
          brand: "Samsung",
          model: "Galaxy S21",
          storage: "256GB",
          ram: "8GB",
          color: "Phantom Gray",
          quantity: 15,
          buyingPrice: "600",
          sellingPrice: "750",
        }
      ]);
      console.log("Inventory seeded.");

      // Add a Customer for the shop
      await db.insert(customers).values({
        shopId: shop.id,
        name: "John Doe",
        mobile: "555-1234",
        address: "456 Elm St",
      });
      console.log("Shop Customer seeded.");
    }
  }
}
