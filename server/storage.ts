
import { db } from "./db";
import { 
  users, shops, inventory, customers, sales, saleItems,
  type User, type InsertUser, type Shop, type InsertShop, 
  type InventoryItem, type InsertInventory, type Customer, type InsertCustomer,
  type Sale, type InsertSale, type SaleItem
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Shops
  createShop(shop: InsertShop): Promise<Shop>;
  getShopsByOwner(ownerId: number): Promise<Shop[]>;
  getAllShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop>;
  deleteShop(id: number): Promise<void>;

  // Inventory
  getInventory(shopId: number): Promise<InventoryItem[]>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventory): Promise<InventoryItem>;
  updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  
  // Customers
  getCustomers(shopId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  searchCustomers(shopId: number, query: string): Promise<Customer[]>;

  // Sales
  createSale(sale: InsertSale, items: { inventoryId: number, quantity: number, unitPrice: number, costPrice: number, brand: string, model: string, variant: string }[]): Promise<Sale>;
  getSales(shopId: number, startDate?: Date, endDate?: Date): Promise<(Sale & { customer: Customer, items: SaleItem[] })[]>;
}

export class DatabaseStorage implements IStorage {
  // === Users ===
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // === Shops ===
  async createShop(shop: InsertShop): Promise<Shop> {
    const [newShop] = await db.insert(shops).values(shop).returning();
    return newShop;
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    return await db.select().from(shops).where(eq(shops.ownerId, ownerId));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async updateShop(id: number, updates: Partial<InsertShop>): Promise<Shop> {
    const [updatedShop] = await db.update(shops).set(updates).where(eq(shops.id, id)).returning();
    return updatedShop;
  }

  async deleteShop(id: number): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  async getAllShops(): Promise<Shop[]> {
    return await db.select().from(shops);
  }

  // === Inventory ===
  async getInventory(shopId: number): Promise<InventoryItem[]> {
    return await db.select().from(inventory).where(eq(inventory.shopId, shopId)).orderBy(desc(inventory.createdAt));
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<InventoryItem> {
    const [updatedItem] = await db.update(inventory).set({ ...updates, updatedAt: new Date() }).where(eq(inventory.id, id)).returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  // === Customers ===
  async getCustomers(shopId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.shopId, shopId));
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async searchCustomers(shopId: number, query: string): Promise<Customer[]> {
    return await db.select().from(customers)
      .where(and(
        eq(customers.shopId, shopId),
        sql`name ILIKE ${`%${query}%`} OR mobile ILIKE ${`%${query}%`}`
      ))
      .limit(10);
  }

  // === Sales ===
  async createSale(
    saleData: InsertSale, 
    itemsData: { inventoryId: number, quantity: number, unitPrice: number, costPrice: number, brand: string, model: string, variant: string }[]
  ): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // 1. Create Sale Record
      const [newSale] = await tx.insert(sales).values(saleData).returning();

      // 2. Create Sale Items and Update Inventory
      for (const item of itemsData) {
        await tx.insert(saleItems).values({
          saleId: newSale.id,
          inventoryId: item.inventoryId,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          costPrice: item.costPrice.toString(),
          brand: item.brand,
          model: item.model,
          variant: item.variant,
        });

        // Decrement stock
        await tx.update(inventory)
          .set({ quantity: sql`quantity - ${item.quantity}` })
          .where(eq(inventory.id, item.inventoryId));
      }

      return newSale;
    });
  }

  async getSales(shopId: number, startDate?: Date, endDate?: Date): Promise<(Sale & { customer: Customer, items: SaleItem[] })[]> {
    let whereClause = eq(sales.shopId, shopId);
    
    if (startDate && endDate) {
      whereClause = and(whereClause, gte(sales.createdAt, startDate), lte(sales.createdAt, endDate));
    }

    const rows = await db.query.sales.findMany({
      where: whereClause,
      with: {
        customer: true,
        items: true,
      },
      orderBy: [desc(sales.createdAt)],
    });

    return rows;
  }
}

export const storage = new DatabaseStorage();
