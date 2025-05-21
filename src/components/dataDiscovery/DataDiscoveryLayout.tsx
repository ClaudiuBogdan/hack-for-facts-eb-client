import React, { useState } from "react";
import { LineItemsFilter } from "../filters/LineItemsFilter";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../ui/dialog"; // Assuming this path is correct for Dialog components
import { Filter as FilterIcon, X } from "lucide-react";

interface DataDiscoveryLayoutProps {
  children: React.ReactNode;
}

export function DataDiscoveryLayout({ children }: DataDiscoveryLayoutProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Desktop Filter Section - Hidden on mobile */}
        <div className="hidden md:block md:w-90 shrink-0"> {/* Preserving md:w-90 as per original */}
          <div className="md:sticky top-4 z-20">
            <LineItemsFilter />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 w-full">
          <div className="rounded-lg border border-border bg-card p-2 md:p-4 shadow-sm min-h-[300px]">
            {children}
          </div>
        </div>
      </div>
      <div className="md:hidden fixed right-6 bottom-[5.75rem] z-50 flex flex-col items-end gap-3">

        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="rounded-full shadow-lg w-14 h-14"
            >
              <FilterIcon className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
            <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
              <DialogTitle className="text-lg font-semibold">Filtre</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              <LineItemsFilter isInModal={true} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
