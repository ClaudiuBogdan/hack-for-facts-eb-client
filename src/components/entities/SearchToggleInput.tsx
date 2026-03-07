import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { t } from "@lingui/core/macro";
    
interface SearchToggleInputProps {
  active: boolean;
  initialSearchTerm: string;
  onToggle: (active: boolean) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number; // target width in px
  focusKey?: string;
}

export const SearchToggleInput: React.FC<SearchToggleInputProps> = ({
  active,
  initialSearchTerm,
  onToggle,
  onChange,
  placeholder = t`Search...`,
  width = 160,
  focusKey = '',
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Keep local state in sync when the initial value coming from props changes
  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);
  // Focus search using hotkeys
  useHotkeys(focusKey, () => {
    onToggle(true);
    inputRef.current?.focus();
  }, {
    enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
  });

  const debouncedOnChange = useDebouncedCallback<[string]>((value) => onChange(value), 500);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedOnChange(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
    onToggle(false);
  };

  return (
    <AnimatePresence initial={false} mode="wait">
      {active ? (
        <motion.div
          key="input"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex h-9 items-center gap-1 overflow-hidden"
        >
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={handleChange}
            placeholder={placeholder}
            className="h-9 flex-1 text-sm"
            autoFocus
          />
          <X
            className="h-4 w-4 cursor-pointer text-muted-foreground flex-shrink-0"
            onClick={() => handleClear()}
          />
        </motion.div>
      ) : (
        <motion.button
          key="icon"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={() => onToggle(true)}
          className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground"
        >
          <Search className="h-5 w-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}; 
