import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useSales } from "@/hooks/use-sales";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Users, Phone, MapPin } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const customerSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  mobile: z.string().min(10, "Valid mobile number is required"),
  address: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const [, params] = useRoute("/shops/:id/customers");
  const shopId = parseInt(params?.id || "0");
  const { toast } = useToast();

  const { data: customers, isLoading } = useCustomers(shopId);
  const createMutation = useCreateCustomer(shopId);

  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: sales, isLoading: salesLoading } = useSales(shopId);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      address: "",
    },
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.mobile.includes(searchQuery)
  ) || [];

  const onSubmit = async (data: CustomerForm) => {
    try {
      await createMutation.mutateAsync(data);
      toast({ title: "Success", description: "Customer added successfully" });
      setDialogOpen(false);
      form.reset();
    } catch (error) {
      toast({ title: "Error", description: "Failed to add customer", variant: "destructive" });
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
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customer database</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-customer">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Add a new customer to your database for quick checkout
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="03XX-XXXXXXX" {...field} data-testid="input-customer-mobile" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Customer address" {...field} data-testid="input-customer-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-customer">
                      {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Add Customer
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-customer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover-elevate cursor-pointer" data-testid={`card-customer-${customer.id}`} onClick={() => { setSelectedCustomer(customer); setDetailOpen(true); }}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{customer.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Phone className="w-3 h-3" />
                      {customer.mobile}
                    </div>
                    {customer.address && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No customers found. Add your first customer to get started.
            </div>
          )}
        </div>

        {/* Customer Details Dialog - shows sales/deals for selected customer */}
        <Dialog open={detailOpen} onOpenChange={(v) => { if (!v) setSelectedCustomer(null); setDetailOpen(v); }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Deals</DialogTitle>
              <DialogDescription>
                {selectedCustomer ? `Deals for ${selectedCustomer.name} (${selectedCustomer.mobile})` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="p-4">
              {salesLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : (
                <div className="space-y-4">
                  {(sales || []).filter(s => s.customer?.id === selectedCustomer?.id).map((sale: any) => (
                    <div key={sale.id} className="p-3 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold">Invoice: {sale.invoiceCode}</div>
                          <div className="text-sm text-muted-foreground">{formatDate(sale.createdAt)}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(sale.totalAmount)}</div>
                          {sale.totalProfit != null && <div className="text-sm text-green-600">Profit: {formatCurrency(sale.totalProfit)}</div>}
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="py-2 px-2 text-left">Item</th>
                              <th className="py-2 px-2 text-left">Variant</th>
                              <th className="py-2 px-2 text-center">Qty</th>
                              <th className="py-2 px-2 text-right">Price</th>
                              <th className="py-2 px-2 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items?.map((it: any, i: number) => (
                              <tr key={i} className="border-b">
                                <td className="py-2 px-2">{it.brand} {it.model}</td>
                                <td className="py-2 px-2 text-muted-foreground">{it.variant}</td>
                                <td className="py-2 px-2 text-center">{it.quantity}</td>
                                <td className="py-2 px-2 text-right">{formatCurrency(it.unitPrice)}</td>
                                <td className="py-2 px-2 text-right">{formatCurrency(Number(it.unitPrice) * it.quantity)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                  {(sales || []).filter(s => s.customer?.id === selectedCustomer?.id).length === 0 && (
                    <div className="py-6 text-center text-muted-foreground">No deals found for this customer.</div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => { setDetailOpen(false); setSelectedCustomer(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </LayoutShell>
    );
  }
