import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useInventory } from "@/hooks/use-inventory";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useCreateSale } from "@/hooks/use-sales";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Plus, Minus, UserPlus, Check, Loader2, X, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { type Customer, type InventoryItem } from "@shared/schema";

export default function PosPage() {
  const [, params] = useRoute("/shops/:id/pos");
  const shopId = parseInt(params?.id || "0");
  const { data: inventory, isLoading, refetch: refetchInventory } = useInventory(shopId);
  const { data: customers } = useCustomers(shopId);
  const { mutateAsync: createCustomer } = useCreateCustomer(shopId);
  const { mutateAsync: createSale, isPending: isProcessing } = useCreateSale(shopId);
  const { toast } = useToast();

  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerMobile, setNewCustomerMobile] = useState("");

  const getQuantity = (itemId: number) => quantities[itemId] || 0;

  const updateQuantity = (itemId: number, newQty: number, maxStock: number) => {
    if (newQty < 0) newQty = 0;
    if (newQty > maxStock) {
      toast({ title: "Insufficient stock", variant: "destructive" });
      newQty = maxStock;
    }
    setQuantities(prev => {
      const updated = { ...prev };
      if (newQty === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = newQty;
      }
      return updated;
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = inventory?.find(i => i.id === parseInt(id));
        return item ? { item, quantity: qty } : null;
      })
      .filter(Boolean) as { item: InventoryItem; quantity: number }[];
  }, [quantities, inventory]);

  const cartTotal = useMemo(() => 
    cartItems.reduce((acc, { item, quantity }) => acc + (Number(item.sellingPrice) * quantity), 0)
  , [cartItems]);

  const totalUnits = cartItems.reduce((sum, c) => sum + c.quantity, 0);
  const hasItemsInCart = cartItems.length > 0;

  const handleCheckout = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select a customer first", variant: "destructive" });
      return;
    }
    if (!hasItemsInCart) {
      toast({ title: "Set quantity for at least one product", variant: "destructive" });
      return;
    }

    try {
      const items = cartItems.map(({ item, quantity }) => ({
        inventoryId: item.id,
        quantity,
        unitPrice: Number(item.sellingPrice) || 0
      }));

      const result = await createSale({
        customerId: selectedCustomer.id,
        items
      });
      
      if (result) {
        setQuantities({});
        setSelectedCustomer(null);
        refetchInventory();
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
        toast({ title: "Customer added" });
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
      <div className="space-y-6">
        
        {/* Header: Customer Selection + Checkout Button */}
        <div className="bg-card border rounded-lg p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">Customer:</span>
          </div>
          
          {selectedCustomer ? (
            <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full">
              <Check className="w-4 h-4" />
              <span className="font-bold">{selectedCustomer.name}</span>
              <span className="text-sm">({selectedCustomer.mobile})</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-5 w-5 rounded-full hover:bg-destructive/20 hover:text-destructive"
                onClick={() => setSelectedCustomer(null)}
                data-testid="btn-clear-customer"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {customers?.map(c => (
                <Button
                  key={c.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomer(c)}
                  data-testid={`btn-select-customer-${c.id}`}
                >
                  {c.name}
                </Button>
              ))}
              <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="secondary" data-testid="btn-add-customer">
                    <UserPlus className="w-4 h-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
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
          )}

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            {hasItemsInCart && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{cartItems.length} products, {totalUnits} units</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
              </div>
            )}
            <Button 
              size="lg"
              className="h-12 px-8 font-bold"
              onClick={handleCheckout}
              disabled={isProcessing || !hasItemsInCart || !selectedCustomer}
              data-testid="btn-complete-sale"
            >
              {isProcessing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              <ShoppingCart className="w-5 h-5 mr-2" />
              Complete Sale
            </Button>
          </div>
        </div>

        {/* All Products Grid - Direct from Inventory */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {inventory?.map(item => {
            const qty = getQuantity(item.id);
            const isOutOfStock = item.quantity === 0;
            
            return (
              <div 
                key={item.id} 
                className={`bg-card border rounded-lg p-4 transition-all ${isOutOfStock ? 'opacity-50' : ''} ${qty > 0 ? 'ring-2 ring-primary border-primary' : ''}`}
                data-testid={`product-card-${item.id}`}
              >
                {/* Product Info */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{item.brand}</Badge>
                    <Badge variant={item.quantity < 5 ? "destructive" : "secondary"} className="text-xs">
                      Stock: {item.quantity}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-lg">{item.model}</h3>
                  <p className="text-sm text-muted-foreground">{item.storage} • {item.ram} {item.color && `• ${item.color}`}</p>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-primary">{formatCurrency(Number(item.sellingPrice))}</p>
                  {qty > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Subtotal: {formatCurrency(Number(item.sellingPrice) * qty)}
                    </p>
                  )}
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-center gap-3 bg-muted/50 rounded-lg p-2">
                  <Button 
                    size="icon" 
                    variant={qty > 0 ? "default" : "outline"}
                    className="h-10 w-10 rounded-full"
                    onClick={() => updateQuantity(item.id, qty - 1, item.quantity)}
                    disabled={qty === 0 || isOutOfStock}
                    data-testid={`btn-decrease-${item.id}`}
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={qty}
                    onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0, item.quantity)}
                    className="w-20 h-10 text-center text-lg font-bold"
                    disabled={isOutOfStock}
                    data-testid={`input-qty-${item.id}`}
                  />
                  <Button 
                    size="icon" 
                    variant={qty > 0 ? "default" : "outline"}
                    className="h-10 w-10 rounded-full"
                    onClick={() => updateQuantity(item.id, qty + 1, item.quantity)}
                    disabled={isOutOfStock || qty >= item.quantity}
                    data-testid={`btn-increase-${item.id}`}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                {qty > 0 && (
                  <div className="mt-3 text-center">
                    <Badge variant="default" className="bg-green-600">
                      Selling {qty} unit{qty > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(!inventory || inventory.length === 0) && (
          <div className="text-center py-20 text-muted-foreground">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No products in inventory</p>
            <p className="text-sm">Add products from the Inventory page first</p>
          </div>
        )}
      </div>
    </LayoutShell>
  );
}
