"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { thClass } from "@/components/ui";
import { cn } from "@/lib/cn";

export type SortDir = "asc" | "desc";

export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  const as = String(a);
  const bs = String(b);
  const aTime = Date.parse(as);
  const bTime = Date.parse(bs);
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && /[-T:]/.test(as)) {
    return aTime - bTime;
  }
  const aNum = Number(as);
  const bNum = Number(bs);
  if (as.trim() !== "" && bs.trim() !== "" && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return as.localeCompare(bs, "fr", { numeric: true, sensitivity: "base" });
}

export function useTableSort<T, K extends string>(
  rows: T[],
  accessors: Record<K, (row: T) => unknown>,
  initialKey: K,
  initialDir: SortDir = "asc",
) {
  const [sortKey, setSortKey] = useState<K>(initialKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const sorted = useMemo(() => {
    const list = [...rows];
    const dir = sortDir === "asc" ? 1 : -1;
    const read = accessors[sortKey];
    list.sort((a, b) => dir * compareSortValues(read(a), read(b)));
    return list;
  }, [accessors, rows, sortDir, sortKey]);

  function toggleSort(key: K) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(
      key === "createdAt" ||
        key === "price" ||
        key === "amount" ||
        key === "sale" ||
        key === "base" ||
        key === "cod" ||
        key === "profit" ||
        key === "deliveryFee" ||
        key === "returnFee" ||
        key === "date" ||
        key.endsWith("At") ||
        key.endsWith("Fee")
        ? "desc"
        : "asc",
    );
  }

  return { sorted, sortKey, sortDir, toggleSort };
}

export function SortableTh<K extends string>({
  label,
  column,
  activeKey,
  sortDir,
  onSort,
  className,
  buttonClassName,
}: {
  label: ReactNode;
  column: K;
  activeKey: K;
  sortDir: SortDir;
  onSort: (column: K) => void;
  className?: string;
  buttonClassName?: string;
}) {
  const active = activeKey === column;
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={cn(thClass, className)}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 text-ops-ink/45 transition hover:text-ops-accent",
          active && "text-ops-ink",
          buttonClassName,
        )}
      >
        {label}
        <Icon className="h-3 w-3 opacity-70" aria-hidden />
      </button>
    </th>
  );
}
