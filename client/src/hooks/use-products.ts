import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertProduct, type Product, type InsertCategory, type Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Products
export function useProducts(shopId: number) {
  return useQuery({
    queryKey: [api.products.list.path, shopId],
    queryFn: async () => {
      const url = buildUrl(api.products.list.path, { shopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      // Ensure numeric types are handled correctly if API returns strings
      return data.map((p: any) => ({
        ...p,
        price: parseFloat(p.price),
        costPrice: p.costPrice ? parseFloat(p.costPrice) : undefined,
      })) as Product[];
    },
    enabled: !!shopId,
  });
}

export function useCreateProduct(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertProduct) => {
      const url = buildUrl(api.products.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return await res.json() as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, shopId] });
      toast({ title: "Success", description: "Product added successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });
}

export function useUpdateProduct(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return await res.json() as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, shopId] });
      toast({ title: "Success", description: "Product updated successfully" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });
}

export function useDeleteProduct(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.products.delete.path, { id });
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, shopId] });
      toast({ title: "Success", description: "Product deleted" });
    },
  });
}

// Categories
export function useCategories(shopId: number) {
  return useQuery({
    queryKey: [api.categories.list.path, shopId],
    queryFn: async () => {
      const url = buildUrl(api.categories.list.path, { shopId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return await res.json() as Category[];
    },
    enabled: !!shopId,
  });
}

export function useCreateCategory(shopId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertCategory) => {
      const url = buildUrl(api.categories.create.path, { shopId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return await res.json() as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.categories.list.path, shopId] });
      toast({ title: "Success", description: "Category created" });
    },
  });
}
