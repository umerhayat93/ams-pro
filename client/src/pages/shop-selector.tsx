import { useShops } from "@/hooks/use-shops";
import { useAuth } from "@/hooks/use-auth";
import { LayoutShell } from "@/components/layout-shell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Store, ArrowRight, MapPin, Phone, Loader2 } from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ShopSelectorPage() {
  const { shops, isLoading, createShop, isCreating } = useShops();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof insertShopSchema>>({
    resolver: zodResolver(insertShopSchema),
    defaultValues: {
      name: "",
      location: "",
      address: "",
      phone: "",
      ownerId: user?.id,
    },
  });

  async function onSubmit(values: z.infer<typeof insertShopSchema>) {
    await createShop({ ...values, ownerId: user!.id });
    setOpen(false);
    form.reset();
  }

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  // If user is a shop_user, they might have a direct shopId assigned. 
  // Redirect logic should happen in App.tsx or useAuth redirection, but here we list available shops.

  return (
    <LayoutShell>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Select Shop</h1>
            <p className="text-muted-foreground mt-1">Manage your inventory and sales by selecting a shop below.</p>
          </div>
          
          {user?.role === "owner" && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20">
                  <Plus className="w-5 h-5 mr-2" />
                  Create New Shop
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Shop</DialogTitle>
                  <DialogDescription>
                    Add a new shop location to your business.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Mobile Zone - Downtown" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City / Area</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="+1 234 567 890" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, Suite 4B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Shop
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops?.map((shop) => (
            <Card key={shop.id} className="group hover:shadow-xl hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden border-border/60">
              <div className="h-2 bg-gradient-to-r from-primary to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <Store className="w-6 h-6" />
                  </div>
                  {shop.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 mt-2">
                  <MapPin className="w-4 h-4" /> {shop.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {shop.phone}
                </div>
                <div className="pl-6 truncate">{shop.address}</div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 border-t border-border/30">
                <Link href={`/shops/${shop.id}/dashboard`} className="w-full">
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors" variant="outline">
                    Enter Shop <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          
          {shops?.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
              <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground">No shops found</h3>
              <p className="text-muted-foreground">Create your first shop to get started.</p>
            </div>
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
