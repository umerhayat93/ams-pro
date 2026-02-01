
import { z } from "zod";
import { 
  insertUserSchema, 
  insertShopSchema, 
  insertCustomerSchema, 
  insertInventorySchema,
  inventory,
  shops,
  customers,
  sales,
  users
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
};

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
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
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
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  admin: {
    createUser: {
      method: "POST" as const,
      path: "/api/admin/users",
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    getUsers: {
      method: "GET" as const,
      path: "/api/admin/users",
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        403: errorSchemas.forbidden,
      },
    }
  },
  shops: {
    list: {
      method: "GET" as const,
      path: "/api/shops",
      responses: {
        200: z.array(z.custom<typeof shops.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops",
      input: insertShopSchema,
      responses: {
        201: z.custom<typeof shops.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/shops/:id",
      responses: {
        200: z.custom<typeof shops.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/shops/:id",
      input: insertShopSchema.partial(),
      responses: {
        200: z.custom<typeof shops.$inferSelect>(),
        403: errorSchemas.forbidden,
      },
    },
  },
  inventory: {
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/inventory",
      input: z.object({
        lowStock: z.boolean().optional(),
        brand: z.string().optional(),
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof inventory.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/inventory",
      input: insertInventorySchema,
      responses: {
        201: z.custom<typeof inventory.$inferSelect>(),
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/inventory/:id",
      input: insertInventorySchema.partial(),
      responses: {
        200: z.custom<typeof inventory.$inferSelect>(),
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/inventory/:id",
      responses: {
        204: z.void(),
      },
    },
  },
  customers: {
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/customers",
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof customers.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/customers",
      input: insertCustomerSchema,
      responses: {
        201: z.custom<typeof customers.$inferSelect>(),
      },
    },
  },
  sales: {
    create: {
      method: "POST" as const,
      path: "/api/shops/:shopId/sales",
      input: z.object({
        customerId: z.number(),
        items: z.array(z.object({
          inventoryId: z.number(),
          quantity: z.number(),
          unitPrice: z.number(),
        })),
      }),
      responses: {
        201: z.custom<typeof sales.$inferSelect & { items: any[] }>(),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/shops/:shopId/sales",
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof sales.$inferSelect & { customer: typeof customers.$inferSelect, items: any[] }>()),
      },
    },
  },
  reports: {
    get: {
      method: "GET" as const,
      path: "/api/shops/:shopId/reports",
      input: z.object({
        type: z.enum(["owner", "customer"]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
      responses: {
        200: z.any(), // Flexible report data structure
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
