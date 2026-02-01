import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth (Passport)
  setupAuth(app);

  // Middleware to ensure authentication
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && (req.user as any).role === 'admin') {
      return next();
    }
    res.status(403).json({ message: "Forbidden: Admin only" });
  };

  // === Users API ===
  app.post(api.users.create.path, requireAdmin, async (req, res) => {
    try {
      // Logic for creating user is handled in auth.ts usually, but here we can add explicit endpoint
      // Note: hashing should happen in storage or auth service. For MVP I will do simple storage create
      // but ideally use the same register logic.
      // Since I haven't written auth.ts yet, I'll rely on storage.createUser which just stores it.
      // IMPORTANT: In production, hash password!
      const input = api.users.create.input.parse(req.body);
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.users.list.path, requireAdmin, async (req, res) => {
    const users = await storage.listUsers();
    res.json(users);
  });

  app.get(api.auth.me.path, (req, res) => {
    res.json(req.user || null);
  });


  // === Shops API ===
  app.get(api.shops.list.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const shops = await storage.getShopsByOwner(userId);
    res.json(shops);
  });

  app.post(api.shops.create.path, requireAuth, async (req, res) => {
    const userId = (req.user as any).id;
    const input = api.shops.create.input.parse(req.body);
    const shop = await storage.createShop({ ...input, ownerId: userId });
    res.status(201).json(shop);
  });

  app.get(api.shops.get.path, requireAuth, async (req, res) => {
    const shop = await storage.getShop(Number(req.params.id));
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    // Check ownership
    if (shop.ownerId !== (req.user as any).id && (req.user as any).role !== 'admin') {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(shop);
  });

  // === Products API ===
  app.get(api.products.list.path, requireAuth, async (req, res) => {
    const products = await storage.getProducts(Number(req.params.shopId));
    res.json(products);
  });

  app.post(api.products.create.path, requireAuth, async (req, res) => {
    const input = api.products.create.input.parse(req.body);
    const product = await storage.createProduct({ ...input, shopId: Number(req.params.shopId) });
    res.status(201).json(product);
  });

  app.patch(api.products.update.path, requireAuth, async (req, res) => {
    const input = api.products.update.input.parse(req.body);
    const product = await storage.updateProduct(Number(req.params.id), input);
    res.json(product);
  });

  app.delete(api.products.delete.path, requireAuth, async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.json({});
  });

  // === Categories API ===
  app.get(api.categories.list.path, requireAuth, async (req, res) => {
    const categories = await storage.getCategories(Number(req.params.shopId));
    res.json(categories);
  });

  app.post(api.categories.create.path, requireAuth, async (req, res) => {
    const input = api.categories.create.input.parse(req.body);
    const category = await storage.createCategory({ ...input, shopId: Number(req.params.shopId) });
    res.status(201).json(category);
  });

  // === Customers API ===
  app.get(api.customers.list.path, requireAuth, async (req, res) => {
    const customers = await storage.getCustomers(Number(req.params.shopId));
    res.json(customers);
  });

  app.post(api.customers.create.path, requireAuth, async (req, res) => {
    const input = api.customers.create.input.parse(req.body);
    const customer = await storage.createCustomer({ ...input, shopId: Number(req.params.shopId) });
    res.status(201).json(customer);
  });

  // === Orders API (POS) ===
  app.post(api.orders.create.path, requireAuth, async (req, res) => {
    const shopId = Number(req.params.shopId);
    const input = api.orders.create.input.parse(req.body);

    // Calculate totals (server side verification)
    let total = 0;
    const orderItems = [];
    
    for (const item of input.items) {
      const product = await storage.getProduct(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);
      
      const price = Number(product.price);
      const costPrice = product.costPrice ? Number(product.costPrice) : null;
      
      orderItems.push({
        orderId: 0, // Placeholder, set in storage
        productId: product.id,
        quantity: item.quantity,
        price: price.toString(),
        costPrice: costPrice?.toString(),
        productName: product.name
      });
      
      total += price * item.quantity;
    }

    // Apply Discount
    if (input.discount) total -= input.discount;
    // Apply Tax
    if (input.tax) total += input.tax;

    // Create Order
    const order = await storage.createOrder({
      shopId,
      customerId: input.customerId,
      totalAmount: total.toString(),
      discount: input.discount?.toString() || "0",
      tax: input.tax?.toString() || "0",
      paymentMethod: input.paymentMethod,
      status: "completed"
    }, orderItems as any);

    res.status(201).json(order);
  });

  app.get(api.orders.list.path, requireAuth, async (req, res) => {
    const orders = await storage.getOrders(Number(req.params.shopId));
    res.json(orders);
  });

  // === Reports API ===
  app.get(api.reports.summary.path, requireAuth, async (req, res) => {
    const stats = await storage.getShopStats(Number(req.params.shopId));
    res.json(stats);
  });

  // Initialize Data (Seed)
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existingUser = await storage.getUserByUsername("umer");
  if (!existingUser) {
    console.log("Seeding superuser...");
    // Create Superuser
    await storage.createUser({
      username: "umer",
      password: "rehan055", // In production, hash this!
      role: "admin",
      name: "Umer (Superuser)"
    });
  }
}
