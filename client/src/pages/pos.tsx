import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useInventory } from "@/hooks/use-inventory";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useCreateSale } from "@/hooks/use-sales";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ShoppingCart, Trash2, Plus, Minus, UserPlus, Check, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { type InventoryItem, type Customer } from "@shared/schema";

interface CartItem {
  inventoryItem: InventoryItem;
  quantity: number;
}

export default function PosPage() {
  const [, params] = useRoute("/shops/:id/pos");
  const shopId = parseInt(params?.id || "0");
  const { data: inventory, isLoading } = useInventory(shopId);
  const { data: customers } = useCustomers(shopId);
  const { mutateAsync: createCustomer } = useCreateCustomer(shopId);
  const { mutateAsync: createSale, isPending: isProcessing } = useCreateSale(shopId);
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");

  // Filter inventory
  const filteredInventory = inventory?.filter(item => 
    item.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const addToCart = (item: InventoryItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.inventoryItem.id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          toast({ title: "Insufficient stock", variant: "destructive" });
          return prev;
        }
        return prev.map(i => i.inventoryItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { inventoryItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.inventoryItem.id !== itemId));
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.inventoryItem.id === itemId) {
        const newQty = i.quantity + delta;
        if (newQty <= 0) return i;
        if (newQty > i.inventoryItem.quantity) {
          toast({ title: "Insufficient stock", variant: "destructive" });
          return i;
        }
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (Number(item.inventoryItem.sellingPrice) * item.quantity), 0);

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select a customer first", variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    try {
      const result = await createSale({
        customerId: selectedCustomer.id,
        items: cart.map(i => ({
          inventoryId: i.inventoryItem.id,
          quantity: i.quantity,
          unitPrice: Number(i.inventoryItem.sellingPrice)
        }))
      });
      if (result) {
        setCart([]);
        setSelectedCustomer(null);
      }
    } catch (e) {
      console.error("Sale failed:", e);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName || !newCustomerMobile) {
      toast({ title: "Please enter name and mobile", variant: "destructive" });
      return;
    }
    try {
      const customer = await createCustomer({
        name: newCustomerName,
        mobile: newCustomerMobile,
        shopId
      });
      if (customer) {
        setSelectedCustomer(customer);
        setCustomerDialogOpen(false);
        setNewCustomerName("");
        setNewCustomerMobile("");
        toast({ title: "Customer added to sale" });
      }
    } catch (e) {
      console.error("Failed to create customer:", e);
    }
  };

  return (
    <LayoutShell shopId={shopId}>
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        
        {/* Left: Product Grid */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 h-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInventory.map(item => (
                <Card 
                  key={item.id} 
                  className={`
                    cursor-pointer transition-all hover:border-primary hover:shadow-md
                    ${item.quantity === 0 ? "opacity-50 grayscale pointer-events-none" : ""}
                  `}
                  onClick={() => addToCart(item)}
                >
                  <CardContent className="p-4 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-[10px]">{item.brand}</Badge>
                        <Badge variant={item.quantity < 5 ? "destructive" : "secondary"} className="text-[10px]">
                          {item.quantity} left
                        </Badge>
                      </div>
                      <h3 className="font-bold text-sm line-clamp-2 mb-1">{item.model}</h3>
                      <p className="text-xs text-muted-foreground">{item.storage} • {item.ram}</p>
                    </div>
                    <div className="mt-3 font-bold text-primary">
                      {formatCurrency(Number(item.sellingPrice))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredInventory.length === 0 && (
                <div className="col-span-full py-10 text-center text-muted-foreground">
                  No products found.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Cart */}
        <div className="w-full md:w-96 flex flex-col gap-4 min-h-0 bg-card border rounded-xl shadow-lg shadow-black/5 overflow-hidden">
          
          {/* Customer Selection */}
          <div className="p-4 border-b bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Current Sale
              </h2>
              {selectedCustomer && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="h-6 text-xs text-destructive">
                  Clear
                </Button>
              )}
            </div>
            
            {!selectedCustomer ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      placeholder="Find customer..." 
                      className="h-9 pl-8 text-sm"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                    />
                    {customerSearch && (
                      <div className="absolute top-full left-0 right-0 bg-popover border shadow-lg rounded-md mt-1 max-h-40 overflow-auto z-10">
                        {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                          <div 
                            key={c.id} 
                            className="p-2 hover:bg-muted text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch("");
                            }}
                          >
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.mobile}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Customer</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Mobile</Label>
                          <Input value={newCustomerMobile} onChange={e => setNewCustomerMobile(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateCustomer}>Save Customer</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-primary">{selectedCustomer.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomer.mobile}</p>
                </div>
                <div className="bg-primary text-primary-foreground p-1.5 rounded-full">
                  <Check className="w-3 h-3" />
                </div>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.inventoryItem.id} className="flex gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex-1">
                    <p className="font-bold text-sm line-clamp-1">{item.inventoryItem.brand} {item.inventoryItem.model}</p>
                    <p className="text-xs text-muted-foreground mb-2">{item.inventoryItem.storage}</p>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateQuantity(item.inventoryItem.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-6 w-6 rounded-full"
                        onClick={() => updateQuantity(item.inventoryItem.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between items-end">
                    <span className="font-bold text-sm">
                      {formatCurrency(Number(item.inventoryItem.sellingPrice) * item.quantity)}
                    </span>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromCart(item.inventoryItem.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Cart is empty</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Totals */}
          <div className="p-4 border-t bg-muted/10 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>
            {!selectedCustomer && cart.length > 0 && (
              <p className="text-sm text-amber-600 text-center">Select a customer to complete sale</p>
            )}
            {selectedCustomer && cart.length === 0 && (
              <p className="text-sm text-amber-600 text-center">Add products to cart to complete sale</p>
            )}
            <Button 
              className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0 || !selectedCustomer}
            >
              {isProcessing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {cart.length === 0 ? "Add Products First" : !selectedCustomer ? "Select Customer" : "Complete Sale"}
            </Button>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
