import { Button } from "./button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { t } from "@lingui/core/macro";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  onCopy: () => void | Promise<void>;
  className?: string;
  ariaLabel?: string;
  copiedLabel?: string;
  errorLabel?: string;
}

type CopyStatus = "idle" | "copied" | "error";

export const CopyButton = ({
  onCopy,
  className,
  ariaLabel = t`Copiază`,
  copiedLabel = t`Copiat`,
  errorLabel = t`Copiere indisponibilă`,
}: CopyButtonProps) => {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const handleCopy = async () => {
    if (status === "copied") return;
    try {
      await onCopy();
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (status !== "idle") {
      timeout = setTimeout(() => setStatus("idle"), 1200);
    }
    return () => clearTimeout(timeout);
  }, [status]);

  const currentLabel =
    status === "copied"
      ? copiedLabel
      : status === "error"
        ? errorLabel
        : ariaLabel;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "text-muted-foreground hover:bg-background relative h-9 w-9 p-2",
          className
        )}
        onClick={handleCopy}
        aria-label={currentLabel}
      >
        <AnimatePresence mode="wait">
          {status === "copied" ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.05 }}
              className="absolute inset-0 flex items-center justify-center text-foreground"
            >
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.05 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Copy className="h-4 w-4" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status === "idle" ? "" : currentLabel}
      </span>
    </>
  );
};
