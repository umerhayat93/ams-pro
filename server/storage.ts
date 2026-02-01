import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  users, shops, products, categories, customers, orders, orderItems,
  type User, type InsertUser, type Shop, type InsertShop,
  type Product, type InsertProduct, type Category, type InsertCategory,
  type Customer, type InsertCustomer, type Order, type InsertOrder, type OrderItem, type InsertOrderItem
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  listUsers(): Promise<User[]>;

  // Shops
  getShopsByOwner(ownerId: number): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop>;

  // Products
  getProducts(shopId: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Categories
  getCategories(shopId: number): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Customers
  getCustomers(shopId: number): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Orders
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<Order>;
  getOrders(shopId: number): Promise<(Order & { items: OrderItem[] })[]>;
  
  // Reports
  getShopStats(shopId: number): Promise<{
    todaySales: number;
    monthSales: number;
    totalOrders: number;
    lowStock: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getShopsByOwner(ownerId: number): Promise<Shop[]> {
    return await db.select().from(shops).where(eq(shops.ownerId, ownerId));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const [shop] = await db.insert(shops).values(insertShop).returning();
    return shop;
  }

  async updateShop(id: number, update: Partial<InsertShop>): Promise<Shop> {
    const [shop] = await db.update(shops).set(update).where(eq(shops.id, id)).returning();
    return shop;
  }

  async getProducts(shopId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.shopId, shopId));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, update: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(update).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getCategories(shopId: number): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.shopId, shopId));
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(insertCategory).returning();
    return category;
  }

  async getCustomers(shopId: number): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.shopId, shopId));
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async createOrder(insertOrder: InsertOrder, items: InsertOrderItem[]): Promise<Order> {
    // Transaction to ensure order and items are created together and stock is updated
    return await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values(insertOrder).returning();
      
      for (const item of items) {
        await tx.insert(orderItems).values({ ...item, orderId: order.id });
        
        // Decrease stock
        // Note: In a real app, check for negative stock
        await tx.execute(
          sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.productId}`
        );
      }
      
      return order;
    });
  }

  async getOrders(shopId: number): Promise<(Order & { items: OrderItem[] })[]> {
    const shopOrders = await db.select().from(orders).where(eq(orders.shopId, shopId)).orderBy(desc(orders.createdAt));
    
    // This is N+1, but for simplicity in this MVP it's okay. Drizzle's `query` builder is better for this but I'm using core here.
    // Or I can fetch all items for these orders.
    const result = [];
    for (const order of shopOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      result.push({ ...order, items });
    }
    return result;
  }

  async getShopStats(shopId: number): Promise<{ todaySales: number; monthSales: number; totalOrders: number; lowStock: number }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sales Today
    const todayOrders = await db.select().from(orders)
      .where(and(
        eq(orders.shopId, shopId),
        sql`${orders.createdAt} >= ${startOfDay}`
      ));
    const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Sales Month
    const monthOrders = await db.select().from(orders)
      .where(and(
        eq(orders.shopId, shopId),
        sql`${orders.createdAt} >= ${startOfMonth}`
      ));
    const monthSales = monthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    // Total Orders
    const allOrdersCount = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.shopId, shopId));
    
    // Low Stock (< 5)
    const lowStockCount = await db.select({ count: sql<number>`count(*)` }).from(products)
      .where(and(
        eq(products.shopId, shopId),
        sql`stock < 5`
      ));

    return {
      todaySales,
      monthSales,
      totalOrders: Number(allOrdersCount[0]?.count || 0),
      lowStock: Number(lowStockCount[0]?.count || 0),
    };
  }
}

export const storage = new DatabaseStorage();
