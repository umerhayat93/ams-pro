import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useSales } from "@/hooks/use-sales";
import { useInventory } from "@/hooks/use-inventory";
import { useShop } from "@/hooks/use-shops";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, TrendingUp, DollarSign, Package, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { startOfDay, format, subDays } from "date-fns";

export default function DashboardPage() {
  const [, params] = useRoute("/shops/:id/dashboard");
  const shopId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { data: shop } = useShop(shopId);
  const { data: inventory, isLoading: loadingInventory } = useInventory(shopId);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  
  // Fetch sales for today
  const today = startOfDay(new Date()).toISOString();
  const { data: sales, isLoading: loadingSales } = useSales(shopId);

  const isOwner = user?.role === "owner";

  if (loadingInventory || loadingSales || !shop) {
    return (
      <LayoutShell shopId={shopId}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  // Calculations
  const todaySales = sales?.filter(s => new Date(s.createdAt!) >= new Date(today)) || [];
  const totalSalesToday = todaySales.reduce((acc, sale) => acc + Number(sale.totalAmount), 0);
  const totalProfitToday = todaySales.reduce((acc, sale) => acc + Number(sale.totalProfit), 0);
  
  const lowStockItems = inventory?.filter(i => i.quantity <= (i.lowStockThreshold || 5)) || [];
  const totalItems = inventory?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  
  // Recent sales for table
  const recentSales = [...(sales || [])].sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()).slice(0, 5);

  // Mock chart data for last 7 days
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "MMM dd");
    return { name: dateStr, sales: Math.floor(Math.random() * 5000) + 1000 };
  });

  return (
    <LayoutShell shopId={shopId}>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview for {shop.name}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSalesToday)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {todaySales.length} transactions today
              </p>
            </CardContent>
          </Card>

          {isOwner && (
            <Card className="border-l-4 border-l-green-500 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfitToday)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Net profit margin
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-l-4 border-l-blue-400 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems} units</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {inventory?.length} products
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockItems.length} items</div>
              <p className="text-xs text-muted-foreground mt-1">
                Restock recommended
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <Card className="lg:col-span-2 shadow-md border-border/60">
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `PKR ${value.toLocaleString()}`} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Sales List */}
          <Card className="shadow-md border-border/60">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="rounded-lg border border-border/50 overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                      data-testid={`transaction-row-${sale.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{sale.invoiceCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {sale.customer?.name || 'Walk-in'} • {formatDate(sale.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-sm">
                          {formatCurrency(Number(sale.totalAmount))}
                        </div>
                        {expandedSale === sale.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expandedSale === sale.id && (
                      <div className="px-3 pb-3 bg-muted/30 animate-in slide-in-from-top-1 duration-200">
                        <div className="text-xs text-muted-foreground mb-2 pt-2 border-t">Items sold:</div>
                        <div className="space-y-1">
                          {sale.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.brand} {item.model} ({item.variant}) x{item.quantity}</span>
                              <span className="font-medium">{formatCurrency(Number(item.unitPrice) * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        {isOwner && sale.totalProfit && (
                          <div className="flex justify-between text-sm mt-2 pt-2 border-t text-green-600 font-medium">
                            <span>Profit</span>
                            <span>{formatCurrency(Number(sale.totalProfit))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {recentSales.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No sales recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Stock Table */}
        {lowStockItems.length > 0 && (
          <Card className="shadow-md border-orange-200">
            <CardHeader className="bg-orange-50/50">
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-muted-foreground bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Product</th>
                      <th className="px-4 py-3">Variant</th>
                      <th className="px-4 py-3 rounded-r-lg text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{item.brand} {item.model}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.storage} / {item.ram}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LayoutShell>
  );
}
