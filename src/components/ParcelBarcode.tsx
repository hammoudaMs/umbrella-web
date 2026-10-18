"use client";

import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { code128Svg } from "@/lib/code128";

type Props = {
  code: string;
  className?: string;
  height?: number;
};

/** Always on white — dark UI would make Code128 unreadable to scanners/cameras. */
export function ParcelBarcode({ code, className, height = 64 }: Props) {
  const svg = useMemo(() => {
    try {
      return code128Svg(code, { height, moduleWidth: 1.6, includeText: true });
    } catch {
      return null;
    }
  }, [code, height]);

  if (!svg) {
    return (
      <p className="rounded-lg bg-white px-3 py-2 text-center font-mono text-sm text-black">
        {code}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex justify-center rounded-lg bg-white px-4 py-3",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
