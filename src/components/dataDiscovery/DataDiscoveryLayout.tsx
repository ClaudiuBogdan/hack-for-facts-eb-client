import React from "react";
import { Filter } from "../filters/Filter";

interface DataDiscoveryLayoutProps {
  children: React.ReactNode;
}

export function DataDiscoveryLayout({ children }: DataDiscoveryLayoutProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row gap-4 w-full">
        <div className="w-full md:w-90 shrink-0">
          <div className="md:sticky top-4 z-20">
            <Filter />
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="rounded-lg border border-border bg-card p-2 md:p-4 shadow-sm min-h-[300px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
