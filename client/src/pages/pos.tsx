import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useInventory } from "@/hooks/use-inventory";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useCreateSale } from "@/hooks/use-sales";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, ShoppingCart, Plus, Minus, UserPlus, Check, Loader2, Package } from "lucide-react";
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
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");

  const filteredInventory = inventory?.filter(item => 
    item.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.brand.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getQuantity = (itemId: number) => cart.get(itemId) || 0;

  const updateQuantity = (itemId: number, delta: number, maxStock: number) => {
    setCart(prev => {
      const newCart = new Map(prev);
      const currentQty = newCart.get(itemId) || 0;
      const newQty = currentQty + delta;
      
      if (newQty <= 0) {
        newCart.delete(itemId);
      } else if (newQty > maxStock) {
        toast({ title: "Insufficient stock", variant: "destructive" });
        return prev;
      } else {
        newCart.set(itemId, newQty);
      }
      return newCart;
    });
  };

  const setQuantityDirect = (itemId: number, qty: number, maxStock: number) => {
    setCart(prev => {
      const newCart = new Map(prev);
      if (qty <= 0) {
        newCart.delete(itemId);
      } else if (qty > maxStock) {
        toast({ title: "Insufficient stock", variant: "destructive" });
        newCart.set(itemId, maxStock);
      } else {
        newCart.set(itemId, qty);
      }
      return newCart;
    });
  };

  const cartItems = inventory?.filter(item => cart.has(item.id)) || [];
  const cartTotal = cartItems.reduce((acc, item) => acc + (Number(item.sellingPrice) * (cart.get(item.id) || 0)), 0);
  const hasItemsInCart = cart.size > 0;

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select a customer first", variant: "destructive" });
      return;
    }
    if (!hasItemsInCart) {
      toast({ title: "Add products to cart first", variant: "destructive" });
      return;
    }

    try {
      const items = Array.from(cart.entries()).map(([inventoryId, quantity]) => {
        const item = inventory?.find(i => i.id === inventoryId);
        return {
          inventoryId,
          quantity,
          unitPrice: Number(item?.sellingPrice || 0)
        };
      });

      const result = await createSale({
        customerId: selectedCustomer.id,
        items
      });
      
      if (result) {
        setCart(new Map());
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
      <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
        
        {/* Left: Product List with Quantity Controls */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search products..." 
                className="pl-9 h-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                data-testid="input-search-products"
              />
            </div>
          </div>

          <Card className="flex-1 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Select Products & Quantities
              </CardTitle>
            </CardHeader>
            <ScrollArea className="h-[calc(100%-3.5rem)]">
              <div className="divide-y">
                {filteredInventory.map(item => {
                  const qty = getQuantity(item.id);
                  const isOutOfStock = item.quantity === 0;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-4 flex items-center gap-4 ${isOutOfStock ? 'opacity-50 bg-muted/20' : ''} ${qty > 0 ? 'bg-primary/5' : ''}`}
                      data-testid={`product-row-${item.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">{item.brand}</Badge>
                          <Badge variant={item.quantity < 5 ? "destructive" : "secondary"} className="text-[10px]">
                            Stock: {item.quantity}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-sm truncate">{item.model}</h3>
                        <p className="text-xs text-muted-foreground">{item.storage} • {item.ram} {item.color && `• ${item.color}`}</p>
                      </div>
                      
                      <div className="text-right mr-4">
                        <p className="font-bold text-primary">{formatCurrency(Number(item.sellingPrice))}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.id, -1, item.quantity)}
                          disabled={qty === 0 || isOutOfStock}
                          data-testid={`btn-decrease-${item.id}`}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={qty}
                          onChange={e => setQuantityDirect(item.id, parseInt(e.target.value) || 0, item.quantity)}
                          className="w-14 h-8 text-center p-1"
                          disabled={isOutOfStock}
                          data-testid={`input-qty-${item.id}`}
                        />
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.id, 1, item.quantity)}
                          disabled={isOutOfStock || qty >= item.quantity}
                          data-testid={`btn-increase-${item.id}`}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredInventory.length === 0 && (
                  <div className="py-10 text-center text-muted-foreground">
                    No products found in inventory.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Right: Cart Summary & Checkout */}
        <div className="w-full md:w-96 flex flex-col gap-4 min-h-0 bg-card border rounded-xl shadow-lg shadow-black/5 overflow-hidden">
          
          {/* Customer Selection */}
          <div className="p-4 border-b bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Sale Summary
              </h2>
              {selectedCustomer && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="h-6 text-xs text-destructive" data-testid="btn-clear-customer">
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
                      placeholder="Search customer..." 
                      className="h-9 pl-8 text-sm"
                      value={customerSearch}
                      onChange={e => setCustomerSearch(e.target.value)}
                      data-testid="input-search-customer"
                    />
                    {customerSearch && (
                      <div className="absolute top-full left-0 right-0 bg-popover border shadow-lg rounded-md mt-1 max-h-40 overflow-auto z-50">
                        {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.mobile.includes(customerSearch)).map(c => (
                          <div 
                            key={c.id} 
                            className="p-2 hover:bg-muted text-sm cursor-pointer"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch("");
                            }}
                            data-testid={`customer-option-${c.id}`}
                          >
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.mobile}</p>
                          </div>
                        ))}
                        {customers?.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.mobile.includes(customerSearch)).length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">No customers found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="outline" className="h-9 w-9 shrink-0" data-testid="btn-add-customer">
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
                          <Input value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} data-testid="input-new-customer-name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Mobile</Label>
                          <Input value={newCustomerMobile} onChange={e => setNewCustomerMobile(e.target.value)} data-testid="input-new-customer-mobile" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateCustomer} data-testid="btn-save-customer">Save Customer</Button>
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

          {/* Cart Items Summary */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {cartItems.map((item) => {
                const qty = cart.get(item.id) || 0;
                return (
                  <div key={item.id} className="flex gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="flex-1">
                      <p className="font-bold text-sm line-clamp-1">{item.brand} {item.model}</p>
                      <p className="text-xs text-muted-foreground">{item.storage} × {qty}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm">
                        {formatCurrency(Number(item.sellingPrice) * qty)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {!hasItemsInCart && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No items selected</p>
                  <p className="text-xs mt-1">Set quantity for products on the left</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer Totals */}
          <div className="p-4 border-t bg-muted/10 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Items</span>
              <span className="font-medium">{cart.size} products</span>
            </div>
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>
            {!selectedCustomer && hasItemsInCart && (
              <p className="text-sm text-amber-600 text-center">Select a customer to complete sale</p>
            )}
            {selectedCustomer && !hasItemsInCart && (
              <p className="text-sm text-amber-600 text-center">Set product quantities to complete sale</p>
            )}
            <Button 
              className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
              onClick={handleCheckout}
              disabled={isProcessing || !hasItemsInCart || !selectedCustomer}
              data-testid="btn-complete-sale"
            >
              {isProcessing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {!hasItemsInCart ? "Select Products" : !selectedCustomer ? "Select Customer" : "Complete Sale"}
            </Button>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
