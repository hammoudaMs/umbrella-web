export type StockItem = {
  id: number;
  senderId: number;
  name: string;
  variant: string;
  size: string | null;
  sku: string | null;
  quantity: number;
  unitCost: number;
  defaultSalePrice: number | null;
  lowStockAt: number | null;
  stockValue: number;
  lowStock: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StockListResponse = {
  items: StockItem[];
  summary: {
    totalQty: number;
    stockValue: number;
    skuCount: number;
  };
};

export function stockLabel(
  item: Pick<StockItem, "name" | "variant" | "size">,
): string {
  const parts = [item.name];
  const v = item.variant?.trim();
  const s = item.size?.trim();
  if (v) parts.push(v);
  if (s) parts.push(s);
  return parts.join(" · ");
}
