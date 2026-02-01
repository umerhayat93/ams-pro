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
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, FileText, Download, Printer, TrendingUp, DollarSign, FileDown, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ReportsPage() {
  const [, params] = useRoute("/shops/:id/reports");
  const shopId = parseInt(params?.id || "0");
  const { user } = useAuth();
  const { data: shop } = useShop(shopId);
  const canSeeProfit = user?.role === "superuser" || user?.role === "customer";

  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const { data: sales, isLoading } = useSales(shopId, startDate, endDate);

  const totalSales = sales?.reduce((acc, s) => acc + Number(s.totalAmount), 0) || 0;
  const totalProfit = sales?.reduce((acc, s) => acc + Number(s.totalProfit || 0), 0) || 0;
  const totalTransactions = sales?.length || 0;

  const exportReportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(shop?.name || "Sales Report", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${shop?.address || ""} | ${shop?.location || ""} | Phone: ${shop?.phone || ""}`, pageWidth / 2, 28, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Report Period: ${format(new Date(startDate), "PP")} - ${format(new Date(endDate), "PP")}`, 14, 42);
    doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 50);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, 65);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Sales: PKR ${totalSales.toLocaleString()}`, 14, 75);
    if (canSeeProfit) {
      doc.text(`Total Profit: PKR ${totalProfit.toLocaleString()}`, 14, 83);
    }
    doc.text(`Total Transactions: ${totalTransactions}`, 14, canSeeProfit ? 91 : 83);
    
    const tableHeaders = canSeeProfit 
      ? [["Invoice", "Customer", "Date", "Amount", "Profit"]]
      : [["Invoice", "Customer", "Date", "Amount"]];
    
    const tableData = sales?.map(sale => {
      const row = [
        sale.invoiceCode,
        sale.customer?.name || "Walk-in",
        formatDate(sale.createdAt),
        `PKR ${Number(sale.totalAmount).toLocaleString()}`
      ];
      if (canSeeProfit) {
        row.push(`PKR ${Number(sale.totalProfit || 0).toLocaleString()}`);
      }
      return row;
    }) || [];
    
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: canSeeProfit ? 100 : 95,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
    
    doc.save(`sales-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const exportInvoicePDF = (sale: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(shop?.name || "Invoice", pageWidth / 2, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${shop?.address || ""}`, pageWidth / 2, 33, { align: "center" });
    doc.text(`${shop?.location || ""} | Phone: ${shop?.phone || ""}`, pageWidth / 2, 40, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(14, 47, pageWidth - 14, 47);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice: ${sale.invoiceCode}`, 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(sale.createdAt)}`, 14, 66);
    
    doc.setFont("helvetica", "bold");
    doc.text("Customer Details", pageWidth - 14, 58, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`${sale.customer?.name || "Walk-in"}`, pageWidth - 14, 66, { align: "right" });
    doc.text(`${sale.customer?.mobile || "N/A"}`, pageWidth - 14, 74, { align: "right" });
    
    const tableHeaders = canSeeProfit
      ? [["Item", "Variant", "Qty", "Price", "Cost", "Profit", "Total"]]
      : [["Item", "Variant", "Qty", "Price", "Total"]];
    
    const tableData = sale.items?.map((item: any) => {
      const lineTotal = Number(item.unitPrice) * item.quantity;
      const lineProfit = (Number(item.unitPrice) - Number(item.costPrice || 0)) * item.quantity;
      
      const row = [
        `${item.brand} ${item.model}`,
        item.variant,
        item.quantity.toString(),
        `PKR ${Number(item.unitPrice).toLocaleString()}`
      ];
      
      if (canSeeProfit) {
        row.push(`PKR ${Number(item.costPrice || 0).toLocaleString()}`);
        row.push(`PKR ${lineProfit.toLocaleString()}`);
      }
      
      row.push(`PKR ${lineTotal.toLocaleString()}`);
      return row;
    }) || [];
    
    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: 85,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: canSeeProfit ? {
        5: { textColor: [34, 197, 94] }
      } : {},
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    
    doc.setFont("helvetica", "bold");
    doc.text(`Total: PKR ${Number(sale.totalAmount).toLocaleString()}`, pageWidth - 14, finalY + 15, { align: "right" });
    
    if (canSeeProfit && sale.totalProfit) {
      doc.setTextColor(34, 197, 94);
      doc.text(`Profit: PKR ${Number(sale.totalProfit).toLocaleString()}`, pageWidth - 14, finalY + 23, { align: "right" });
      doc.setTextColor(0);
    }
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", pageWidth / 2, finalY + 40, { align: "center" });
    
    doc.save(`invoice-${sale.invoiceCode}.pdf`);
  };

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">View sales reports and generate invoices</p>
          </div>
          <Button onClick={exportReportPDF} data-testid="button-export-pdf">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF Report
          </Button>
        </div>

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
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => {
                  setStartDate(format(new Date(), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }} data-testid="button-today">
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setStartDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }} data-testid="button-7days">
                  Last 7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setStartDate(format(startOfMonth(new Date()), "yyyy-MM-dd"));
                  setEndDate(format(endOfMonth(new Date()), "yyyy-MM-dd"));
                }} data-testid="button-month">
                  This Month
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-primary">
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
          {canSeeProfit && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
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
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Sales History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(startDate), "MMM d")} - {format(new Date(endDate), "MMM d, yyyy")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-right py-3 px-4 font-medium">Amount</th>
                    {canSeeProfit && <th className="text-right py-3 px-4 font-medium">Profit</th>}
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales?.map((sale) => (
                    <tr 
                      key={sale.id} 
                      className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                      data-testid={`row-sale-${sale.id}`}
                    >
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono">{sale.invoiceCode}</Badge>
                      </td>
                      <td className="py-3 px-4">{sale.customer?.name || 'Walk-in'}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(sale.createdAt)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(sale.totalAmount)}</td>
                      {canSeeProfit && (
                        <td className="py-3 px-4 text-right text-green-600 font-medium">
                          {formatCurrency(sale.totalProfit || 0)}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" onClick={() => printInvoice(sale, false)} title="Print Invoice" data-testid={`button-print-${sale.id}`}>
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => exportInvoicePDF(sale)} title="Download PDF" data-testid={`button-pdf-${sale.id}`}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales?.length === 0 && (
                    <tr>
                      <td colSpan={canSeeProfit ? 6 : 5} className="py-12 text-center text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No sales found for the selected date range.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedSale && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top duration-200 border">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Sale Details - {selectedSale.invoiceCode}</h4>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => printInvoice(selectedSale, canSeeProfit)}>
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportInvoicePDF(selectedSale)}>
                      <Download className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-2 px-3 font-medium">Item</th>
                        <th className="text-left py-2 px-3 font-medium">Variant</th>
                        <th className="text-center py-2 px-3 font-medium">Qty</th>
                        <th className="text-right py-2 px-3 font-medium">Price</th>
                        {canSeeProfit && <th className="text-right py-2 px-3 font-medium">Cost</th>}
                        {canSeeProfit && <th className="text-right py-2 px-3 font-medium">Profit</th>}
                        <th className="text-right py-2 px-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3 font-medium">{item.brand} {item.model}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.variant}</td>
                          <td className="py-2 px-3 text-center">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          {canSeeProfit && <td className="py-2 px-3 text-right text-muted-foreground">{formatCurrency(item.costPrice || 0)}</td>}
                          {canSeeProfit && (
                            <td className="py-2 px-3 text-right text-green-600 font-medium">
                              {formatCurrency((Number(item.unitPrice) - Number(item.costPrice || 0)) * item.quantity)}
                            </td>
                          )}
                          <td className="py-2 px-3 text-right font-bold">
                            {formatCurrency(Number(item.unitPrice) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/50">
                        <td colSpan={canSeeProfit ? 6 : 4} className="py-2 px-3 text-right font-bold">Grand Total:</td>
                        <td className="py-2 px-3 text-right font-bold text-lg">{formatCurrency(selectedSale.totalAmount)}</td>
                      </tr>
                      {canSeeProfit && selectedSale.totalProfit && (
                        <tr className="bg-green-50 dark:bg-green-900/20">
                          <td colSpan={6} className="py-2 px-3 text-right font-bold text-green-600">Total Profit:</td>
                          <td className="py-2 px-3 text-right font-bold text-lg text-green-600">{formatCurrency(selectedSale.totalProfit)}</td>
                        </tr>
                      )}
                    </tfoot>
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
