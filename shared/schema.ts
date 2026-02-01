
import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const userRoles = ["superuser", "customer"] as const;
export type UserRole = (typeof userRoles)[number];

// === TABLES ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: userRoles }).notNull().default("customer"),
  name: text("name"), // Display name for the user
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(), // City / Area
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  ownerId: integer("owner_id").notNull(), // Link to owner user
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  brand: text("brand").notNull(), // Apple, Samsung, etc.
  model: text("model").notNull(), // iPhone 13, etc.
  storage: text("storage").notNull(), // 128GB, etc.
  ram: text("ram").notNull(), // 8GB, etc.
  color: text("color"),
  quantity: integer("quantity").notNull().default(0),
  buyingPrice: numeric("buying_price").notNull(), // Visible only to owner
  sellingPrice: numeric("selling_price").notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  customerId: integer("customer_id").notNull(),
  invoiceCode: text("invoice_code").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  totalProfit: numeric("total_profit").notNull(), // Snapshot for reporting
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull(),
  inventoryId: integer("inventory_id").notNull(),
  brand: text("brand").notNull(), // Snapshot
  model: text("model").notNull(), // Snapshot
  variant: text("variant").notNull(), // Snapshot (Storage + RAM)
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  costPrice: numeric("cost_price").notNull(), // Snapshot for profit calc
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(users, {
    fields: [shops.ownerId],
    references: [users.id],
  }),
  inventory: many(inventory),
  customers: many(customers),
  sales: many(sales),
  users: many(users), // Shop users belonging to this shop
}));

export const usersRelations = relations(users, ({ many }) => ({
  shops: many(shops), // User can own multiple shops
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  shop: one(shops, {
    fields: [inventory.shopId],
    references: [shops.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  shop: one(shops, {
    fields: [customers.shopId],
    references: [shops.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  shop: one(shops, {
    fields: [sales.shopId],
    references: [shops.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  inventory: one(inventory, {
    fields: [saleItems.inventoryId],
    references: [inventory.id],
  }),
}));

// === INSERT SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true, invoiceCode: true, totalProfit: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type Shop = typeof shops.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type InventoryItem = typeof inventory.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;

// === API SPECIFIC TYPES ===

export type LoginRequest = {
  username: string;
  password: string;
};

export type CreateSaleRequest = {
  customerId: number;
  items: {
    inventoryId: number;
    quantity: number;
    unitPrice: number; // In case of override, otherwise default from DB
  }[];
};
