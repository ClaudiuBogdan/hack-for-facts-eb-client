import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "../theme/theme-provider";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "system" as Theme, icon: Monitor, tooltip: "System" },
    { value: "light" as Theme, icon: Sun, tooltip: "Light" },
    { value: "dark" as Theme, icon: Moon, tooltip: "Dark" },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = options.findIndex((opt) => opt.value === theme);

    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault();
        const nextIndex =
          e.key === "ArrowLeft"
            ? (currentIndex - 1 + options.length) % options.length
            : (currentIndex + 1) % options.length;
        setTheme(options[nextIndex].value);
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        const button = e.currentTarget as HTMLButtonElement;
        const value = button.getAttribute("data-value") as Theme;
        if (value) setTheme(value);
        break;
      }
    }
  };

  return (
    <TooltipProvider>
      <DropdownMenuItem
        className="w-full"
        role="menuitem"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-sm">Theme</span>
          <div
            className="flex space-x-0.5"
            role="radiogroup"
            aria-label="Theme selection"
          >
            {options.map((option) => (
              <Tooltip key={option.value} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    role="radio"
                    aria-checked={theme === option.value}
                    data-value={option.value}
                    data-state={
                      theme === option.value ? "checked" : "unchecked"
                    }
                    className={cn("h-8 w-8 rounded-sm", {
                      "bg-primary": theme === option.value,
                      "hover:bg-secondary": theme !== option.value,
                      "hover:text-accent-foreground": theme !== option.value,
                      "hover:bg-accent-foreground": theme === option.value,
                      "hover:text-primary-foreground": theme === option.value,
                      "focus-visible:ring-1": true,
                      "focus-visible:ring-ring": true,
                      "focus-visible:outline-hidden": true,
                    })}
                    onClick={() => setTheme(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setTheme(option.value);
                      }
                    }}
                  >
                    <option.icon
                      className={cn("h-4 w-4", {
                        "text-primary-foreground": theme === option.value,
                      })}
                    />
                    <span className="sr-only">{option.tooltip} theme</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={10}>
                  <p>{option.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </DropdownMenuItem>
    </TooltipProvider>
  );
}
