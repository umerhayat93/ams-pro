import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-cart";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useCreateOrder } from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, User, X, Loader2 } from "lucide-react";
import { Product } from "@shared/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

export default function POS() {
  const [, params] = useRoute("/shop/:id/pos");
  const shopId = parseInt(params?.id || "0");
  const { data: products, isLoading: loadingProducts } = useProducts(shopId);
  const { data: categories } = useCategories(shopId);
  const { data: customers } = useCustomers(shopId);
  const createCustomer = useCreateCustomer(shopId);
  const createOrder = useCreateOrder(shopId);
  
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { 
    items, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    total, 
    subtotal, 
    taxAmount, 
    clearCart,
    customer,
    setCustomer,
    discount,
    setDiscount
  } = useCart();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.sku?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const handleCheckout = () => {
    createOrder.mutate({
      customerId: customer?.id,
      paymentMethod,
      discount: discount,
      tax: taxAmount,
      items: items.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }))
    }, {
      onSuccess: () => {
        setIsCheckoutOpen(false);
        clearCart();
      }
    });
  };

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", address: "" }
  });

  function onCustomerSubmit(data: z.infer<typeof customerSchema>) {
    createCustomer.mutate({ ...data, shopId }, {
      onSuccess: (newCustomer) => {
        setCustomer(newCustomer);
        form.reset();
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] gap-6 -mt-2">
      {/* Left Side: Products */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products by name or SKU..." 
              className="pl-9 h-12 bg-card border-border/60 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <ScrollArea className="w-full pb-2">
          <div className="flex gap-2">
            <Button 
              variant={activeCategory === 'all' ? "default" : "outline"}
              onClick={() => setActiveCategory('all')}
              className="rounded-full"
            >
              All Items
            </Button>
            {categories?.map(cat => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
                className="rounded-full"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Product Grid */}
        <ScrollArea className="flex-1 -mr-4 pr-4">
          {loadingProducts ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  className="group bg-card border border-border/50 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer flex flex-col h-full"
                  onClick={() => addToCart(product)}
                >
                  <div className="aspect-square bg-muted/30 relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                        <span className="text-4xl font-bold text-muted-foreground/20">
                          {product.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-medium shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform">
                        Add to Cart
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold truncate" title={product.name}>{product.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">Stock: {product.stock}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="font-bold text-lg text-primary">${Number(product.price).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Side: Cart */}
      <div className="w-[380px] flex flex-col bg-card rounded-2xl border border-border shadow-xl shadow-black/5 overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Current Order
            </h2>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-between border-dashed">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {customer ? customer.name : "Select Customer (Optional)"}
                </span>
                {customer && <X className="w-4 h-4 ml-2" onClick={(e) => { e.stopPropagation(); setCustomer(null); }} />}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select or Add Customer</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="select">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="select">Select Existing</TabsTrigger>
                  <TabsTrigger value="new">Create New</TabsTrigger>
                </TabsList>
                
                <div className="p-4">
                  <TabsContent value="select" className="mt-0">
                    <Select onValueChange={(val) => setCustomer(customers?.find(c => c.id === parseInt(val)) || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers?.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                  
                  <TabsContent value="new" className="mt-0">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onCustomerSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full">Create Customer</Button>
                      </form>
                    </Form>
                  </TabsContent>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1 p-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
              <ShoppingCart className="w-12 h-12" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    {item.image ? (
                      <img src={item.image} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="font-bold text-xs">{item.name.substring(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <div className="text-primary font-bold text-sm">${Number(item.price).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md" 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/20 border-t border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Discount</span>
            <Input 
              type="number" 
              className="h-6 w-20 text-right px-2 py-0" 
              value={discount} 
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} 
            />
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-2xl text-primary">${total.toFixed(2)}</span>
          </div>

          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogTrigger asChild>
              <Button className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20" disabled={items.length === 0}>
                Charge ${total.toFixed(2)}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Complete Payment</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-4 py-4">
                {['cash', 'card', 'online'].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all
                      ${paymentMethod === method 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-muted bg-card hover:bg-muted/50'
                      }
                    `}
                  >
                    <CreditCard className="w-6 h-6 mb-2" />
                    <span className="capitalize font-medium">{method}</span>
                  </button>
                ))}
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
                {paymentMethod === 'cash' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cash Received</span>
                    <Input className="w-24 text-right" placeholder="0.00" />
                  </div>
                )}
              </div>

              <Button onClick={handleCheckout} className="w-full h-11" disabled={createOrder.isPending}>
                {createOrder.isPending ? <Loader2 className="animate-spin mr-2" /> : null}
                Confirm Payment
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

// Helper to make Tabs work nicely without importing everything from radix directly in the file
import * as TabsPrimitive from "@radix-ui/react-tabs"
const TabsContent = TabsPrimitive.Content
