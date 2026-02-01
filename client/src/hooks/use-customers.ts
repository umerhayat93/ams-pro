import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useCustomers(shopId: number) {
  return useQuery({
    queryKey: [api.customers.list.path, shopId],
    queryFn: async () => {
      const url = buildUrl(api.customers.list.path, { shopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return await res.json() as Customer[];
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
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return await res.json() as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path, shopId] });
      toast({ title: "Success", description: "Customer created successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });
}
