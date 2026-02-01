import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCustomers(shopId: number, search?: string) {
  return useQuery({
    queryKey: [api.customers.list.path, shopId, search],
    queryFn: async () => {
      if (!shopId) return [];
      const queryParams = search ? `?search=${encodeURIComponent(search)}` : "";
      const url = buildUrl(api.customers.list.path, { shopId }) + queryParams;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
    enabled: !!shopId,
  });
}

export function useCreateCustomer(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCustomer) => {
      const url = buildUrl(api.customers.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path, shopId] });
      toast({ title: "Customer created" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating customer",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
