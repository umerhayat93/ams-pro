import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type Order, type InsertOrder } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Type needed for order creation input as defined in routes
type CreateOrderInput = z.infer<typeof api.orders.create.input>;

export function useOrders(shopId: number) {
  return useQuery({
    queryKey: [api.orders.list.path, shopId],
    queryFn: async () => {
      const url = buildUrl(api.orders.list.path, { shopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return await res.json();
    },
    enabled: !!shopId,
  });
}

export function useCreateOrder(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const url = buildUrl(api.orders.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path, shopId] });
      // Also invalidate products to update stock
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, shopId] });
      // And reports
      queryClient.invalidateQueries({ queryKey: [api.reports.summary.path, shopId] });
      
      toast({ title: "Order Completed", description: "Transaction recorded successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });
}

export function useReports(shopId: number) {
  return useQuery({
    queryKey: [api.reports.summary.path, shopId],
    queryFn: async () => {
      const url = buildUrl(api.reports.summary.path, { shopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return await res.json() as z.infer<typeof api.reports.summary.responses[200]>;
    },
    enabled: !!shopId,
  });
}
