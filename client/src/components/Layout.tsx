import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Store, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu,
  X,
  ChevronRight,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Extract shopId if present in URL
  const match = location.match(/\/shop\/(\d+)/);
  const shopId = match ? match[1] : null;

  const NavItem = ({ href, icon: Icon, label, active }: any) => (
    <Link href={href}>
      <div 
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
          ${active 
            ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' 
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }
        `}
      >
        <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
        {label}
        {active && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
      </div>
    </Link>
  );

  const Navigation = () => (
    <div className="space-y-6 py-6 h-full flex flex-col">
      <div className="px-4 mb-2">
        <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-primary">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          Inventory Pro
        </div>
      </div>

      <div className="px-3 flex-1">
        <div className="space-y-1">
          {!shopId && (
            <NavItem 
              href="/" 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={location === "/"} 
            />
          )}

          {shopId && (
            <>
              <div className="px-3 pb-2 pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Shop Management
              </div>
              <NavItem 
                href={`/shop/${shopId}`} 
                icon={LayoutDashboard} 
                label="Overview" 
                active={location === `/shop/${shopId}`} 
              />
              <NavItem 
                href={`/shop/${shopId}/pos`} 
                icon={ShoppingCart} 
                label="POS System" 
                active={location.includes("/pos")} 
              />
              <NavItem 
                href={`/shop/${shopId}/inventory`} 
                icon={Package} 
                label="Inventory" 
                active={location.includes("/inventory")} 
              />
              <NavItem 
                href={`/shop/${shopId}/customers`} 
                icon={Users} 
                label="Customers" 
                active={location.includes("/customers")} 
              />
              <NavItem 
                href={`/shop/${shopId}/sales`} 
                icon={Store} 
                label="Sales History" 
                active={location.includes("/sales")} 
              />
              <NavItem 
                href={`/shop/${shopId}/reports`} 
                icon={BarChart3} 
                label="Reports" 
                active={location.includes("/reports")} 
              />
              <NavItem 
                href={`/shop/${shopId}/settings`} 
                icon={Settings} 
                label="Settings" 
                active={location.includes("/settings")} 
              />
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Separator className="my-4" />
              <div className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </div>
              <NavItem 
                href="/admin" 
                icon={Users} 
                label="Manage Users" 
                active={location === "/admin"} 
              />
            </>
          )}
        </div>
      </div>

      <div className="px-3 mt-auto">
        <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {user?.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="font-medium text-sm truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{user?.role}</div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 border-r border-border bg-card">
        <Navigation />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen max-w-[100vw] overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 border-b border-border bg-card flex items-center px-4 justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-lg text-primary">
            <Store className="w-5 h-5" />
            Inventory Pro
          </div>
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Navigation />
            </SheetContent>
          </Sheet>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
