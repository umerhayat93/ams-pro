import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(), // Link to users.id
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  logo: text("logo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  categoryId: integer("category_id"),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // For profit calculation
  stock: integer("stock").notNull().default(0),
  sku: text("sku"),
  barcode: text("barcode"),
  image: text("image"),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  customerId: integer("customer_id"), // Optional (guest checkout)
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: text("payment_method").notNull(), // cash, card, online
  status: text("status").notNull().default("completed"), // completed, pending, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Price at time of sale
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }), // Cost at time of sale
  productName: text("product_name").notNull(), // Snapshot
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  shops: many(shops),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(users, {
    fields: [shops.ownerId],
    references: [users.id],
  }),
  products: many(products),
  categories: many(categories),
  customers: many(customers),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ one }) => ({
  shop: one(shops, {
    fields: [products.shopId],
    references: [shops.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  shop: one(shops, {
    fields: [orders.shopId],
    references: [shops.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Customer = typeof customers.$inferSelect;
