import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertShop, type Shop } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useShops() {
  return useQuery({
    queryKey: [api.shops.list.path],
    queryFn: async () => {
      const res = await fetch(api.shops.list.path);
      if (!res.ok) throw new Error("Failed to fetch shops");
      return await res.json() as Shop[];
    },
  });
}

export function useShop(id: number) {
  return useQuery({
    queryKey: [api.shops.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.shops.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch shop");
      return await res.json() as Shop;
    },
    enabled: !!id,
  });
}

export function useCreateShop() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertShop) => {
      const res = await fetch(api.shops.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create shop");
      return await res.json() as Shop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.shops.list.path] });
      toast({ title: "Success", description: "Shop created successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });
}
