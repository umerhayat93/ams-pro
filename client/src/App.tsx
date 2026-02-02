import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import ShopSelectorPage from "@/pages/shop-selector";
import DashboardPage from "@/pages/dashboard";
import PosPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import CustomersPage from "@/pages/customers";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import AdminPage from "@/pages/admin";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function SuperuserRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "superuser") {
    return <Redirect to="/" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/admin">
        <SuperuserRoute component={AdminPage} />
      </Route>
      
      <Route path="/">
        <ProtectedRoute component={ShopSelectorPage} />
      </Route>
      
      <Route path="/shops/:id/dashboard">
        <ProtectedRoute component={DashboardPage} />
      </Route>

      <Route path="/shops/:id/pos">
        <ProtectedRoute component={PosPage} />
      </Route>

      <Route path="/shops/:id/inventory">
        <ProtectedRoute component={InventoryPage} />
      </Route>

      <Route path="/shops/:id/customers">
        <ProtectedRoute component={CustomersPage} />
      </Route>

      <Route path="/shops/:id/reports">
        <ProtectedRoute component={ReportsPage} />
      </Route>

      <Route path="/shops/:id/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Router />
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
