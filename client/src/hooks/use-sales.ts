import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateSaleRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useSales(shopId: number, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: [api.sales.list.path, shopId, startDate, endDate],
    queryFn: async () => {
      if (!shopId) return [];
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      
      const url = buildUrl(api.sales.list.path, { shopId }) + `?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales");
      return api.sales.list.responses[200].parse(await res.json());
    },
    enabled: !!shopId,
  });
}

export function useCreateSale(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSaleRequest) => {
      const url = buildUrl(api.sales.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to process sale");
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sales.list.path, shopId] });
      queryClient.invalidateQueries({ queryKey: [api.inventory.list.path, shopId] }); // Inventory changed
      toast({ title: "Sale recorded successfully!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error processing sale",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
