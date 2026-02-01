import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { CartProvider } from "@/hooks/use-cart";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import ShopDashboard from "@/pages/ShopDashboard";
import POS from "@/pages/POS";
import Inventory from "@/pages/Inventory";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/shop/:id">
        <ProtectedRoute component={ShopDashboard} />
      </Route>
      
      <Route path="/shop/:id/pos">
        <CartProvider>
          <ProtectedRoute component={POS} />
        </CartProvider>
      </Route>
      
      <Route path="/shop/:id/inventory">
        <ProtectedRoute component={Inventory} />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
