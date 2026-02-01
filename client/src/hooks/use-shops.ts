import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertShop, type Shop } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useShops() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shops, isLoading } = useQuery({
    queryKey: [api.shops.list.path],
    queryFn: async () => {
      const res = await fetch(api.shops.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shops");
      return api.shops.list.responses[200].parse(await res.json());
    },
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: InsertShop) => {
      const res = await fetch(api.shops.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create shop");
      return api.shops.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shops.list.path] });
      toast({ title: "Shop created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating shop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    shops,
    isLoading,
    createShop: createShopMutation.mutateAsync,
    isCreating: createShopMutation.isPending,
  };
}

export function useShop(id: number) {
  return useQuery({
    queryKey: [api.shops.get.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.shops.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch shop");
      return api.shops.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateShop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertShop>) => {
      const url = buildUrl(api.shops.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update shop");
      return api.shops.update.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.shops.get.path, variables.id] });
      queryClient.invalidateQueries({ queryKey: [api.shops.list.path] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating shop",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
