import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useShop, useUpdateShop } from "@/hooks/use-shops";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Store, Users, Save, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

const shopSchema = z.object({
  name: z.string().min(1, "Shop name is required"),
  location: z.string().min(1, "Location is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(10, "Valid phone number is required"),
});

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["owner", "shop_user"]),
  shopId: z.coerce.number().optional(),
});

type ShopForm = z.infer<typeof shopSchema>;
type UserForm = z.infer<typeof userSchema>;

export default function SettingsPage() {
  const [, params] = useRoute("/shops/:id/settings");
  const shopId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop, isLoading: loadingShop } = useShop(shopId);
  const updateShopMutation = useUpdateShop();

  // Users query (owner only)
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: user?.role === "owner",
  });

  // Get all shops for assigning users
  const { data: allShops } = useQuery({
    queryKey: ["/api/shops"],
    enabled: user?.role === "owner",
  });

  const [userDialogOpen, setUserDialogOpen] = useState(false);

  const shopForm = useForm<ShopForm>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      location: "",
      address: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (shop) {
      shopForm.reset({
        name: shop.name,
        location: shop.location,
        address: shop.address,
        phone: shop.phone,
      });
    }
  }, [shop]);

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "shop_user",
      shopId: shopId,
    },
  });


  const createUserMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      return await apiRequest("POST", "/api/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User created successfully" });
      setUserDialogOpen(false);
      userForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create user", variant: "destructive" });
    },
  });

  const onShopSubmit = async (data: ShopForm) => {
    try {
      await updateShopMutation.mutateAsync({ id: shopId, ...data });
      toast({ title: "Success", description: "Shop details updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update shop", variant: "destructive" });
    }
  };

  const onUserSubmit = async (data: UserForm) => {
    await createUserMutation.mutateAsync(data);
  };

  if (loadingShop) {
    return (
      <LayoutShell shopId={shopId}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  if (user?.role !== "owner") {
    return (
      <LayoutShell shopId={shopId}>
        <div className="flex h-96 items-center justify-center text-muted-foreground">
          Settings are only available to shop owners.
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell shopId={shopId}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage shop details and user accounts</p>
        </div>

        <Tabs defaultValue="shop" className="space-y-6">
          <TabsList>
            <TabsTrigger value="shop" data-testid="tab-shop">
              <Store className="w-4 h-4 mr-2" />
              Shop Details
            </TabsTrigger>
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop">
            <Card>
              <CardHeader>
                <CardTitle>Shop Information</CardTitle>
                <CardDescription>Update your shop details. These will appear on invoices and reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...shopForm}>
                  <form onSubmit={shopForm.handleSubmit(onShopSubmit)} className="space-y-4">
                    <FormField
                      control={shopForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shop Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-shop-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={shopForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location (City/Area)</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-shop-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={shopForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-shop-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={shopForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Address</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-shop-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={updateShopMutation.isPending} data-testid="button-save-shop">
                      {updateShopMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Accounts</CardTitle>
                  <CardDescription>Manage shopkeeper accounts and permissions</CardDescription>
                </div>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-user">
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Create a new shopkeeper account with login credentials
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...userForm}>
                      <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                        <FormField
                          control={userForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-new-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} data-testid="input-new-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="shop_user">Shopkeeper</SelectItem>
                                  <SelectItem value="owner">Owner</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={userForm.control}
                          name="shopId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign to Shop</FormLabel>
                              <Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value || "")}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-shop">
                                    <SelectValue placeholder="Select shop" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {(allShops as any[])?.map((s: any) => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-create-user">
                            {createUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create User
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium">Username</th>
                          <th className="text-left py-3 px-4 font-medium">Role</th>
                          <th className="text-left py-3 px-4 font-medium">Assigned Shop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(users as any[])?.map((u: any) => (
                          <tr key={u.id} className="border-b" data-testid={`row-user-${u.id}`}>
                            <td className="py-3 px-4 font-medium">{u.username}</td>
                            <td className="py-3 px-4">
                              <Badge variant={u.role === "owner" ? "default" : "secondary"}>
                                {u.role === "owner" ? "Owner" : "Shopkeeper"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {u.shopId 
                                ? (allShops as any[])?.find((s: any) => s.id === u.shopId)?.name || `Shop #${u.shopId}`
                                : "All Shops (Owner)"
                              }
                            </td>
                          </tr>
                        ))}
                        {(users as any[])?.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-muted-foreground">
                              No users found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </LayoutShell>
  );
}
