import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertInventory, type InventoryItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useInventory(shopId: number, filters?: { lowStock?: boolean; brand?: string; search?: string }) {
  return useQuery({
    queryKey: [api.inventory.list.path, shopId, filters],
    queryFn: async () => {
      if (!shopId) return [];
      
      const queryParams = new URLSearchParams();
      if (filters?.lowStock) queryParams.set("lowStock", "true");
      if (filters?.brand) queryParams.set("brand", filters.brand);
      if (filters?.search) queryParams.set("search", filters.search);
      
      const url = buildUrl(api.inventory.list.path, { shopId }) + `?${queryParams.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return api.inventory.list.responses[200].parse(await res.json());
    },
    enabled: !!shopId,
  });
}

export function useCreateInventory(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertInventory) => {
      const url = buildUrl(api.inventory.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add inventory");
      return api.inventory.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path, shopId] });
      toast({ title: "Item added to inventory" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateInventory(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertInventory>) => {
      const url = buildUrl(api.inventory.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      return api.inventory.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path, shopId] });
      toast({ title: "Inventory updated" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteInventory(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.inventory.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path, shopId] });
      toast({ title: "Item deleted" });
    },
  });
}
