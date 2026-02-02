
import type { Express } from "express";
import type { Server } from "http";
import { setupAuth, authUtils } from "./auth";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { insertUserSchema, insertShopSchema, insertInventorySchema, insertCustomerSchema } from "@shared/schema";
import { randomBytes } from "crypto";

// Middleware to check role
function requireSuperuser() {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    if (req.user.role !== "superuser") return res.status(403).send("Forbidden: Superuser only");
    next();
  };
}

function requireAuth() {
  return (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    next();
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Set up Passport Auth
  setupAuth(app);

  // === Admin / User Management (Superuser only) ===
  app.post(api.admin.createUser.path, requireSuperuser(), async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      // Check if username exists
      const existing = await storage.getUserByUsername(userData.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }
      // Hash password before storing
      const hashedPassword = await authUtils.hashPassword(userData.password);
      const user = await storage.createUser({ ...userData, password: hashedPassword });
      // Don't return password in response
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (e) {
      res.status(400).json(e);
    }
  });

  app.get(api.admin.getUsers.path, requireSuperuser(), async (req, res) => {
    const users = await storage.getAllUsers();
    // Remove passwords from response
    const safeUsers = users.map(u => {
      const { password, ...safe } = u;
      return safe;
    });
    res.json(safeUsers);
  });
  
  app.delete("/api/admin/users/:id", requireSuperuser(), async (req, res) => {
    await storage.deleteUser(Number(req.params.id));
    res.status(204).send();
  });
  
  app.put("/api/admin/users/:id", requireSuperuser(), async (req, res) => {
    const updates = req.body;
    // If password is being updated, hash it
    if (updates.password) {
      updates.password = await authUtils.hashPassword(updates.password);
    }
    const user = await storage.updateUser(Number(req.params.id), updates);
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });

  // === Shops ===
  app.get(api.shops.list.path, requireAuth(), async (req, res) => {
    // Superuser can see all shops, customers see only their own
    if (req.user!.role === "superuser") {
      const shops = await storage.getAllShops();
      res.json(shops);
    } else {
      const shops = await storage.getShopsByOwner(req.user!.id);
      res.json(shops);
    }
  });

  app.post(api.shops.create.path, requireAuth(), async (req, res) => {
    try {
      const shopData = insertShopSchema.parse({ ...req.body, ownerId: req.user!.id });
      const shop = await storage.createShop(shopData);
      res.status(201).json(shop);
    } catch (e) {
      res.status(400).json(e);
    }
  });

  app.get(api.shops.get.path, requireAuth(), async (req, res) => {
    const shop = await storage.getShop(Number(req.params.id));
    if (!shop) return res.status(404).send("Shop not found");
    
    // Authorization check: superuser can access all, customers only their own
    if (req.user!.role !== "superuser" && shop.ownerId !== req.user!.id) {
      return res.status(403).send("Forbidden");
    }
    
    res.json(shop);
  });

  app.put(api.shops.update.path, requireAuth(), async (req, res) => {
    const shop = await storage.getShop(Number(req.params.id));
    if (!shop) return res.status(404).send("Shop not found");
    
    // Only superuser or shop owner can update
    if (req.user!.role !== "superuser" && shop.ownerId !== req.user!.id) {
      return res.status(403).send("Forbidden");
    }
    
    const updatedShop = await storage.updateShop(Number(req.params.id), req.body);
    res.json(updatedShop);
  });
  
  app.delete("/api/shops/:id", requireAuth(), async (req, res) => {
    const shop = await storage.getShop(Number(req.params.id));
    if (!shop) return res.status(404).send("Shop not found");
    
    // Only superuser or shop owner can delete
    if (req.user!.role !== "superuser" && shop.ownerId !== req.user!.id) {
      return res.status(403).send("Forbidden");
    }
    
    await storage.deleteShop(Number(req.params.id));
    res.status(204).send();
  });

  // === Inventory ===
  app.get(api.inventory.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const inventoryItems = await storage.getInventory(Number(req.params.shopId));
    
    // Both superusers and customers (shop owners) can see buying prices
    res.json(inventoryItems);
  });

  app.post(api.inventory.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const itemData = insertInventorySchema.parse({
        ...req.body,
        shopId: Number(req.params.shopId)
      });
      const item = await storage.createInventoryItem(itemData);
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json(e);
    }
  });

  app.put(api.inventory.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const item = await storage.updateInventoryItem(Number(req.params.id), req.body);
    res.json(item);
  });

  app.delete(api.inventory.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    await storage.deleteInventoryItem(Number(req.params.id));
    res.status(204).send();
  });

  // === Customers ===
  app.get(api.customers.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const query = req.query.search as string;
    if (query) {
      const results = await storage.searchCustomers(Number(req.params.shopId), query);
      res.json(results);
    } else {
      const customers = await storage.getCustomers(Number(req.params.shopId));
      res.json(customers);
    }
  });

  app.post(api.customers.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        shopId: Number(req.params.shopId)
      });
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (e) {
      res.status(400).json(e);
    }
  });

  // === Sales ===
  app.post(api.sales.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { customerId, items } = req.body;
      const shopId = Number(req.params.shopId);
      
      // Validate items array
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "At least one item is required" });
      }
      
      if (!customerId) {
        return res.status(400).json({ message: "Customer is required" });
      }
      
      // Calculate totals and validate stock
      let totalAmount = 0;
      let totalProfit = 0;
      const enrichedItems = [];

      for (const item of items) {
        const inventoryItem = await storage.getInventoryItem(item.inventoryId);
        if (!inventoryItem) {
          return res.status(400).json({ message: `Product not found: ${item.inventoryId}` });
        }
        
        // Validate stock availability
        if (inventoryItem.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${inventoryItem.brand} ${inventoryItem.model}. Available: ${inventoryItem.quantity}, Requested: ${item.quantity}` 
          });
        }
        
        // Safely parse prices - default to 0 if NaN
        const unitPrice = Number(item.unitPrice) || Number(inventoryItem.sellingPrice) || 0;
        const costPrice = Number(inventoryItem.buyingPrice) || 0;
        const quantity = Number(item.quantity) || 0;
        
        if (quantity <= 0) {
          return res.status(400).json({ message: "Quantity must be greater than 0" });
        }
        
        const lineTotal = unitPrice * quantity;
        const lineProfit = (unitPrice - costPrice) * quantity;
        
        totalAmount += lineTotal;
        totalProfit += lineProfit;
        
        enrichedItems.push({
          inventoryId: item.inventoryId,
          quantity,
          unitPrice,
          costPrice,
          brand: inventoryItem.brand,
          model: inventoryItem.model,
          variant: inventoryItem.storage + " " + inventoryItem.ram,
        });
      }

      const saleData = {
        shopId,
        customerId,
        invoiceCode: "INV-" + Date.now().toString().slice(-6),
        totalAmount: totalAmount.toString(),
        totalProfit: totalProfit.toString(),
      };

      const sale = await storage.createSale(saleData, enrichedItems);
      res.status(201).json(sale);
    } catch (error: any) {
      console.error("Sale creation error:", error);
      res.status(500).json({ message: error.message || "Failed to create sale" });
    }
  });

  app.get(api.sales.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const salesData = await storage.getSales(Number(req.params.shopId), startDate, endDate);
    
    // Both superusers and customers (shop owners) can see profit data
    res.json(salesData);
  });

  return httpServer;
}
