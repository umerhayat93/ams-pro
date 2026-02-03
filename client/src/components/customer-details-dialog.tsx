import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sales: any;
  salesLoading: boolean;
  selectedCustomer: any;
  setDetailOpen: (v: boolean) => void;
  setSelectedCustomer: (c: any) => void;
};

export default function CustomerDetailsDialog({ open, onOpenChange, sales, salesLoading, selectedCustomer, setDetailOpen, setSelectedCustomer }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Deals</DialogTitle>
          <DialogDescription>
            {selectedCustomer ? `Deals for ${selectedCustomer.name} (${selectedCustomer.mobile})` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          {salesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {(sales || []).filter((s: any) => s.customer?.id === selectedCustomer?.id).map((sale: any) => (
                <div key={sale.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">Invoice: {sale.invoiceCode}</div>
                      <div className="text-sm text-muted-foreground">{formatDate(sale.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(sale.totalAmount)}</div>
                      {sale.totalProfit != null && <div className="text-sm text-green-600">Profit: {formatCurrency(sale.totalProfit)}</div>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-2 text-left">Item</th>
                          <th className="py-2 px-2 text-left">Variant</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-2 text-right">Price</th>
                          <th className="py-2 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.items?.map((it: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="py-2 px-2">{it.brand} {it.model}</td>
                            <td className="py-2 px-2 text-muted-foreground">{it.variant}</td>
                            <td className="py-2 px-2 text-center">{it.quantity}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(it.unitPrice)}</td>
                            <td className="py-2 px-2 text-right">{formatCurrency(Number(it.unitPrice) * it.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {(sales || []).filter((s: any) => s.customer?.id === selectedCustomer?.id).length === 0 && (
                <div className="py-6 text-center text-muted-foreground">No deals found for this customer.</div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => { setDetailOpen(false); setSelectedCustomer(null); }}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
