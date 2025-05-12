import React from "react";
import { Filter } from "../filters/Filter";

interface DataDiscoveryLayoutProps {
  children: React.ReactNode;
}

export function DataDiscoveryLayout({ children }: DataDiscoveryLayoutProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 flex-col md:flex-row">
        <div className="md:w-90 w-full shrink-0">
          <Filter />
        </div>
        <div className="flex-1">
          <div className="rounded-lg border border-border bg-card">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
