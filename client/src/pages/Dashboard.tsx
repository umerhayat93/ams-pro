import { useShops, useCreateShop } from "@/hooks/use-shops";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Store, Plus, ArrowRight, MapPin, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopSchema, type InsertShop } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function Dashboard() {
  const { data: shops, isLoading } = useShops();
  const { user } = useAuth();
  const createShop = useCreateShop();
  
  const form = useForm<InsertShop>({
    resolver: zodResolver(insertShopSchema),
    defaultValues: {
      name: "",
      address: "",
      phone: "",
      ownerId: user?.id || 0,
    },
  });

  function onSubmit(data: InsertShop) {
    createShop.mutate({ ...data, ownerId: user!.id }, {
      onSuccess: () => {
        form.reset();
      }
    });
  }

  if (isLoading) {
    return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">My Shops</h1>
          <p className="text-muted-foreground mt-1">Select a shop to manage inventory and sales</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Create New Shop
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shop</DialogTitle>
              <DialogDescription>Add a new location to your business.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Super Mart" {...field} />
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
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Market St" {...field} value={field.value || ''} />
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
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 234 567 890" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createShop.isPending}>
                  {createShop.isPending ? "Creating..." : "Create Shop"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {shops?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-2xl border-2 border-dashed border-border/60">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No shops found</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6">
            Get started by creating your first shop to manage inventory and sales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops?.map((shop) => (
            <Link key={shop.id} href={`/shop/${shop.id}`}>
              <Card className="h-full hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 cursor-pointer border-border/60 group">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Store className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl">{shop.name}</CardTitle>
                  <CardDescription>ID: #{shop.id}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary/60" />
                    {shop.address || "No address provided"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary/60" />
                    {shop.phone || "No phone provided"}
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t bg-muted/20">
                  <div className="flex items-center text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                    Manage Shop <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
