import { useRoute } from "wouter";
import { useReports } from "@/hooks/use-orders";
import { useShop } from "@/hooks/use-shops";
import { DollarSign, ShoppingCart, Package, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShopDashboard() {
  const [, params] = useRoute("/shop/:id");
  const shopId = parseInt(params?.id || "0");
  const { data: shop } = useShop(shopId);
  const { data: reports, isLoading } = useReports(shopId);

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={`h-4 w-4 ${colorClass.replace("bg-", "text-")}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display">{value}</div>
        <p className="text-xs text-muted-foreground mt-1 flex items-center">
          <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" />
          Updated just now
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">{shop?.name} Overview</h1>
        <p className="text-muted-foreground mt-1">Daily statistics and quick actions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <StatCard 
              title="Today's Sales" 
              value={`$${reports?.todaySales.toFixed(2)}`} 
              icon={DollarSign} 
              colorClass="bg-green-500 text-green-500"
            />
            <StatCard 
              title="Monthly Sales" 
              value={`$${reports?.monthSales.toFixed(2)}`} 
              icon={DollarSign} 
              colorClass="bg-blue-500 text-blue-500"
            />
            <StatCard 
              title="Total Orders" 
              value={reports?.totalOrders} 
              icon={ShoppingCart} 
              colorClass="bg-purple-500 text-purple-500"
            />
            <StatCard 
              title="Low Stock Items" 
              value={reports?.lowStock} 
              icon={AlertTriangle} 
              colorClass="bg-orange-500 text-orange-500"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/60">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
              <Package className="w-10 h-10 mb-2 opacity-20" />
              <p>Activity charts will appear here</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-border/60">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a href={`/shop/${shopId}/pos`} className="block">
              <div className="flex items-center p-4 bg-primary/5 rounded-lg border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer group">
                <div className="p-2 bg-primary text-primary-foreground rounded-md mr-4 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Open POS</h4>
                  <p className="text-sm text-muted-foreground">Start selling immediately</p>
                </div>
              </div>
            </a>
            
            <a href={`/shop/${shopId}/inventory`} className="block">
              <div className="flex items-center p-4 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors cursor-pointer group">
                <div className="p-2 bg-secondary-foreground/10 text-foreground rounded-md mr-4 group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Add Product</h4>
                  <p className="text-sm text-muted-foreground">Update your inventory</p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
