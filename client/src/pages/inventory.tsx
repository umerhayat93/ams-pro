import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useInventory, useCreateInventory, useUpdateInventory, useDeleteInventory } from "@/hooks/use-inventory";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const BRANDS = ["Apple", "Samsung", "Tecno", "Infinix", "Vivo", "Xiaomi", "Oppo", "Realme", "Other"];
const STORAGE_OPTIONS = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];
const RAM_OPTIONS = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"];

const inventorySchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  storage: z.string().min(1, "Storage is required"),
  ram: z.string().min(1, "RAM is required"),
  color: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
  buyingPrice: z.coerce.number().min(0, "Buying price is required"),
  sellingPrice: z.coerce.number().min(0, "Selling price is required"),
  lowStockThreshold: z.coerce.number().min(1).default(5),
});

type InventoryForm = z.infer<typeof inventorySchema>;

export default function InventoryPage() {
  const [, params] = useRoute("/shops/:id/inventory");
  const shopId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = user?.role === "superuser" || user?.role === "customer";

  const { data: inventory, isLoading } = useInventory(shopId);
  const createMutation = useCreateInventory(shopId);
  const updateMutation = useUpdateInventory(shopId);
  const deleteMutation = useDeleteInventory(shopId);

  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const form = useForm<InventoryForm>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      brand: "",
      model: "",
      storage: "",
      ram: "",
      color: "",
      quantity: 0,
      buyingPrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 5,
    },
  });

  const filteredInventory = inventory?.filter(item => {
    const matchesSearch = item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBrand = brandFilter === "all" || item.brand === brandFilter;
    const matchesLowStock = !showLowStock || item.quantity <= (item.lowStockThreshold || 5);
    return matchesSearch && matchesBrand && matchesLowStock;
  }) || [];

  const onSubmit = async (data: InventoryForm) => {
    try {
      const payload = {
        ...data,
        shopId,
        buyingPrice: String(data.buyingPrice),
        sellingPrice: String(data.sellingPrice),
      };
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...payload });
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Success", description: "Item added successfully" });
      }
      setDialogOpen(false);
      setEditingItem(null);
      form.reset();
    } catch (error) {
      toast({ title: "Error", description: "Failed to save item", variant: "destructive" });
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      brand: item.brand,
      model: item.model,
      storage: item.storage,
      ram: item.ram,
      color: item.color || "",
      quantity: item.quantity,
      buyingPrice: Number(item.buyingPrice),
      sellingPrice: Number(item.sellingPrice),
      lowStockThreshold: item.lowStockThreshold || 5,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      try {
        await deleteMutation.mutateAsync(id);
        toast({ title: "Success", description: "Item deleted successfully" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
      }
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    form.reset({
      brand: "",
      model: "",
      storage: "",
      ram: "",
      color: "",
      quantity: 0,
      buyingPrice: 0,
      sellingPrice: 0,
      lowStockThreshold: 5,
    });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <LayoutShell shopId={shopId}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell shopId={shopId}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage your mobile phone stock</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} data-testid="button-add-inventory">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the inventory item details" : "Add a new mobile phone to your inventory"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-brand">
                                <SelectValue placeholder="Select brand" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {BRANDS.map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. iPhone 13" {...field} data-testid="input-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="storage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-storage">
                                <SelectValue placeholder="Select storage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STORAGE_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RAM</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-ram">
                                <SelectValue placeholder="Select RAM" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {RAM_OPTIONS.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Black" {...field} data-testid="input-color" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-quantity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Stock Alert</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-threshold" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {isOwner && (
                      <FormField
                        control={form.control}
                        name="buyingPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Buying Price (PKR)</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-buying-price" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price (PKR)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-selling-price" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-inventory">
                      {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingItem ? "Update Item" : "Add Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by brand or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-full md:w-48" data-testid="select-filter-brand">
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {BRANDS.map(brand => (
                    <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={showLowStock ? "default" : "outline"}
                onClick={() => setShowLowStock(!showLowStock)}
                data-testid="button-low-stock"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Low Stock
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products ({filteredInventory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Product</th>
                    <th className="text-left py-3 px-4 font-medium">Variant</th>
                    <th className="text-center py-3 px-4 font-medium">Stock</th>
                    {isOwner && <th className="text-right py-3 px-4 font-medium">Buy Price</th>}
                    <th className="text-right py-3 px-4 font-medium">Sell Price</th>
                    {isOwner && <th className="text-right py-3 px-4 font-medium">Profit</th>}
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const isLowStock = item.quantity <= (item.lowStockThreshold || 5);
                    const profit = isOwner ? Number(item.sellingPrice) - Number(item.buyingPrice) : 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/30" data-testid={`row-inventory-${item.id}`}>
                        <td className="py-3 px-4">
                          <div className="font-medium">{item.brand} {item.model}</div>
                          {item.color && <div className="text-xs text-muted-foreground">{item.color}</div>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.storage} / {item.ram}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={isLowStock ? "destructive" : "secondary"}>
                            {item.quantity}
                          </Badge>
                        </td>
                        {isOwner && (
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {formatCurrency(item.buyingPrice)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(item.sellingPrice)}
                        </td>
                        {isOwner && (
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            {formatCurrency(profit)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(item)} data-testid={`button-edit-${item.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(item.id)} data-testid={`button-delete-${item.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 7 : 5} className="py-8 text-center text-muted-foreground">
                        No items found. Add your first product to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
