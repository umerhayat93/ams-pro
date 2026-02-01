import { useState } from "react";
import { useRoute } from "wouter";
import { useProducts, useCreateProduct, useCategories, useCreateCategory, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Edit, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

// Need to coerce numbers because form inputs return strings
const productFormSchema = insertProductSchema.extend({
  price: z.coerce.number(),
  costPrice: z.coerce.number().optional(),
  stock: z.coerce.number(),
  categoryId: z.coerce.number().optional(),
});

export default function Inventory() {
  const [, params] = useRoute("/shop/:id/inventory");
  const shopId = parseInt(params?.id || "0");
  const { data: products, isLoading } = useProducts(shopId);
  const { data: categories } = useCategories(shopId);
  const createProduct = useCreateProduct(shopId);
  const deleteProduct = useDeleteProduct(shopId);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const form = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      shopId: shopId,
    },
  });

  const onSubmit = (data: z.infer<typeof productFormSchema>) => {
    // Convert numbers to strings for Decimal type if needed, but schema expects number/string
    // The backend schema expects decimal, but Zod schema might handle it.
    // The API hook handles JSON body.
    createProduct.mutate({ ...data, shopId }, {
      onSuccess: () => {
        setIsAddOpen(false);
        form.reset();
      }
    });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Inventory</h1>
          <p className="text-muted-foreground">Manage your products and stock levels</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barcode</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createProduct.isPending}>
                  {createProduct.isPending ? "Adding..." : "Save Product"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search inventory..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                 <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading inventory...</TableCell>
               </TableRow>
            ) : filteredProducts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="w-12 h-12 mb-2 opacity-20" />
                    <p>No products found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts?.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div>{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                  </TableCell>
                  <TableCell>
                    {categories?.find(c => c.id === product.categoryId)?.name || '-'}
                  </TableCell>
                  <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`
                      px-2 py-1 rounded-full text-xs font-medium
                      ${product.stock <= 5 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}
                    `}>
                      {product.stock} units
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:text-red-600"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this product?')) {
                          deleteProduct.mutate(product.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
