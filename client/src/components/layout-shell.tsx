import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useShop } from "@/hooks/use-shops";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  FileText,
  LogOut,
  Store,
  Settings,
  User
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutShellProps {
  children: React.ReactNode;
  shopId?: number;
}

export function LayoutShell({ children, shopId }: LayoutShellProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: shop } = useShop(shopId || 0);

  if (!shopId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card sticky top-0 z-10">
          <div className="font-display font-bold text-lg text-primary flex items-center gap-2">
            <Store className="w-5 h-5" />
            AMS Solutions
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    {user?.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: `/shops/${shopId}/dashboard` },
    { icon: ShoppingCart, label: "POS", href: `/shops/${shopId}/pos` },
    { icon: Package, label: "Inventory", href: `/shops/${shopId}/inventory` },
    { icon: Users, label: "Customers", href: `/shops/${shopId}/customers` },
    { icon: FileText, label: "Reports", href: `/shops/${shopId}/reports` },
  ];

  if (user?.role === "superuser") {
    navItems.push({ icon: Settings, label: "Settings", href: `/shops/${shopId}/settings` });
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col pb-16">
      {/* Top Header */}
      <header className="h-14 border-b flex items-center justify-between px-4 bg-card sticky top-0 z-20">
        <Link href="/" className="font-display font-bold text-lg text-primary flex items-center gap-2">
          <Store className="w-5 h-5" />
          <span className="hidden sm:inline">AMS Solutions</span>
          <span className="sm:hidden">AMS</span>
        </Link>
        
        {shop && (
          <div className="flex-1 text-center px-2">
            <p className="text-sm font-medium truncate">{shop.name}</p>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-user-menu">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                  {user?.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className="font-medium">{user?.username}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === 'superuser' && (
              <DropdownMenuItem asChild>
                <Link href="/">
                  <Store className="w-4 h-4 mr-2" />
                  Switch Shop
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => logout()} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around px-2 z-30 safe-area-bottom">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`
                  flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all min-w-[50px]
                  ${isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                  }
                `}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-[10px] mt-0.5 ${isActive ? "font-semibold" : ""}`}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
