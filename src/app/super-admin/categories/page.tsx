"use client";

import { JourneyVisibilityManager } from "@/components/JourneyVisibilityManager";
import { StatusCategoriesManager } from "@/components/StatusCategoriesManager";

export default function SuperAdminCategoriesPage() {
  return (
    <div className="space-y-12">
      <JourneyVisibilityManager />
      <div className="border-t border-ops-card pt-10">
        <StatusCategoriesManager />
      </div>
    </div>
  );
}
