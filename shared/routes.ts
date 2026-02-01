import { z } from "zod";
import { insertUserSchema, insertShopSchema, insertProductSchema, insertCategorySchema, insertCustomerSchema, insertOrderSchema } from "./schema";

export const api = {
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login",
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: insertUserSchema, // Returns user object
        401: z.object({ message: z.string() }),
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout",
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user",
      responses: {
        200: insertUserSchema.nullable(),
      },
    },
  },
  users: {
    create: {
      method: "POST" as const,
      path: "/api/users",
      input: insertUserSchema,
      responses: {
        201: insertUserSchema,
        400: z.object({ message: z.string() }),
      },
    },
    list: { // Admin only
      method: "GET" as const,
      path: "/api/users",
      responses: {
        200: z.array(insertUserSchema),
      },
    },
  },
  shops: {
    list: {
      method: "GET" as const,
      path: "/api/shops",
      responses: {
        200: z.array(insertShopSchema.extend({ id: z.number() })),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops",
      input: insertShopSchema,
      responses: {
        201: insertShopSchema.extend({ id: z.number() }),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/shops/:id",
      responses: {
        200: insertShopSchema.extend({ id: z.number() }),
        404: z.object({ message: z.string() }),
      },
    },
  },
  products: {
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/products",
      responses: {
        200: z.array(insertProductSchema.extend({ id: z.number() })),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/products",
      input: insertProductSchema,
      responses: {
        201: insertProductSchema.extend({ id: z.number() }),
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/products/:id",
      input: insertProductSchema.partial(),
      responses: {
        200: insertProductSchema.extend({ id: z.number() }),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/products/:id",
      responses: {
        200: z.void(),
      },
    },
  },
  categories: {
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/categories",
      responses: {
        200: z.array(insertCategorySchema.extend({ id: z.number() })),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/categories",
      input: insertCategorySchema,
      responses: {
        201: insertCategorySchema.extend({ id: z.number() }),
      },
    },
  },
  customers: {
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/customers",
      responses: {
        200: z.array(insertCustomerSchema.extend({ id: z.number() })),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/customers",
      input: insertCustomerSchema,
      responses: {
        201: insertCustomerSchema.extend({ id: z.number() }),
      },
    },
  },
  orders: {
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/orders",
      input: z.object({
        customerId: z.number().optional(),
        paymentMethod: z.string(),
        discount: z.number().optional(),
        tax: z.number().optional(),
        items: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        })),
      }),
      responses: {
        201: insertOrderSchema.extend({ id: z.number() }),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/orders",
      responses: {
        200: z.array(insertOrderSchema.extend({ id: z.number(), items: z.array(z.any()) })),
      },
    },
  },
  reports: {
    summary: {
      method: "GET" as const,
      path: "/api/shops/:shopId/reports/summary",
      responses: {
        200: z.object({
          todaySales: z.number(),
          monthSales: z.number(),
          totalOrders: z.number(),
          lowStock: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
