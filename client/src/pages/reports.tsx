import { useState } from "react";
import { useRoute } from "wouter";
import { LayoutShell } from "@/components/layout-shell";
import { useSales } from "@/hooks/use-sales";
import { useShop } from "@/hooks/use-shops";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, FileText, Download, Printer, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays } from "date-fns";

export default function ReportsPage() {
  const [, params] = useRoute("/shops/:id/reports");
  const shopId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { data: shop } = useShop(shopId);
  const isOwner = user?.role === "owner";

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const { data: sales, isLoading } = useSales(shopId, startDate, endDate);

  const totalSales = sales?.reduce((acc, s) => acc + Number(s.totalAmount), 0) || 0;
  const totalProfit = sales?.reduce((acc, s) => acc + Number(s.totalProfit || 0), 0) || 0;
  const totalTransactions = sales?.length || 0;

  const printInvoice = (sale: any, includeProfit: boolean) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${sale.invoiceCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .shop-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .shop-details { color: #666; font-size: 14px; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .customer-info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f5f5f5; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">${shop?.name || 'Shop'}</div>
          <div class="shop-details">${shop?.address || ''}</div>
          <div class="shop-details">${shop?.location || ''} | Phone: ${shop?.phone || ''}</div>
        </div>
        
        <div class="invoice-info">
          <div>
            <strong>Invoice:</strong> ${sale.invoiceCode}<br>
            <strong>Date:</strong> ${formatDate(sale.createdAt)}
          </div>
        </div>

        <div class="customer-info">
          <strong>Customer:</strong> ${sale.customer?.name || 'Walk-in'}<br>
          <strong>Mobile:</strong> ${sale.customer?.mobile || 'N/A'}
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Variant</th>
              <th>Qty</th>
              <th>Price</th>
              ${includeProfit ? '<th>Cost</th><th>Profit</th>' : ''}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items?.map((item: any) => `
              <tr>
                <td>${item.brand} ${item.model}</td>
                <td>${item.variant}</td>
                <td>${item.quantity}</td>
                <td>PKR ${Number(item.unitPrice).toLocaleString()}</td>
                ${includeProfit ? `
                  <td>PKR ${Number(item.costPrice || 0).toLocaleString()}</td>
                  <td>PKR ${((Number(item.unitPrice) - Number(item.costPrice || 0)) * item.quantity).toLocaleString()}</td>
                ` : ''}
                <td>PKR ${(Number(item.unitPrice) * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="${includeProfit ? 6 : 4}" style="text-align: right;">Total:</td>
              <td>PKR ${Number(sale.totalAmount).toLocaleString()}</td>
            </tr>
            ${includeProfit ? `
              <tr class="total-row">
                <td colspan="6" style="text-align: right;">Total Profit:</td>
                <td style="color: green;">PKR ${Number(sale.totalProfit || 0).toLocaleString()}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>

        <div class="footer">
          Thank you for your business!<br>
          Generated on ${format(new Date(), 'PPpp')}
        </div>

        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
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
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">View sales reports and generate invoices</p>
        </div>

        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }}>
                  Last 7 Days
                </Button>
                <Button variant="outline" onClick={() => {
                  setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                  setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                }}>
                  This Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {isOwner && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card>
          <CardHeader>
            <CardTitle>Sales History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    {isOwner && <th className="text-right py-3 px-4 font-medium">Profit</th>}
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales?.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                      data-testid={`row-sale-${sale.id}`}
                    >
                      <td className="py-3 px-4">
                        <Badge variant="outline">{sale.invoiceCode}</Badge>
                      </td>
                      <td className="py-3 px-4">{sale.customer?.name || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(sale.createdAt)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(sale.totalAmount)}</td>
                      {isOwner && (
                        <td className="py-3 px-4 text-right text-green-600 font-medium">
                          {formatCurrency(sale.totalProfit || 0)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => printInvoice(sale, false)} data-testid={`button-print-customer-${sale.id}`}>
                            <Printer className="w-4 h-4" />
                          </Button>
                          {isOwner && (
                            <Button size="sm" variant="ghost" onClick={() => printInvoice(sale, true)} data-testid={`button-print-owner-${sale.id}`}>
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales?.length === 0 && (
                    <tr>
                      <td colSpan={isOwner ? 6 : 5} className="py-8 text-center text-muted-foreground">
                        No sales found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Expandable Sale Details */}
            {selectedSale && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top duration-200">
                <h4 className="font-semibold mb-3">Sale Details - {selectedSale.invoiceCode}</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Item</th>
                        <th className="text-left py-2 px-3">Variant</th>
                        <th className="text-center py-2 px-3">Qty</th>
                        <th className="text-right py-2 px-3">Price</th>
                        {isOwner && <th className="text-right py-2 px-3">Cost</th>}
                        {isOwner && <th className="text-right py-2 px-3">Profit</th>}
                        <th className="text-right py-2 px-3">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3">{item.brand} {item.model}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.variant}</td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          {isOwner && <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(item.costPrice || 0)}</td>}
                          {isOwner && (
                            <td className="py-2 px-3 text-right text-green-600">
                              {formatCurrency((Number(item.unitPrice) - Number(item.costPrice || 0)) * item.quantity)}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-medium">
                            {formatCurrency(Number(item.unitPrice) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
