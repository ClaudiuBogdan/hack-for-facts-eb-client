/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useCallback, useState } from "react";
import * as Sentry from "@sentry/react";
import { AppError, ErrorSource } from "@/lib/errors/types";
import { logger } from "@/lib/logger";
import { Analytics } from "@/lib/analytics";

interface ErrorContextValue {
  error: AppError | null;
  handleError: (error: Error, source?: ErrorSource) => void;
  clearError: () => void;
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined);

interface ErrorProviderProps {
  children: React.ReactNode;
  onError?: (error: AppError) => void;
}

export function ErrorProvider({ children, onError }: ErrorProviderProps) {
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback(
    (error: Error, source?: ErrorSource) => {
      const appError = AppError.isAppError(error)
        ? error
        : AppError.fromError(error, source);

      setError(appError);

      // Log the error with structured metadata
      logger.error("Application error occurred", {
        error: appError,
        type: appError.type,
        code: appError.code,
        severity: appError.severity,
        timestamp: appError.timestamp,
        context: appError.context,
      });

      // Capture error in Sentry
      Sentry.captureException(appError, {
        extra: {
          type: appError.type,
          code: appError.code,
          severity: appError.severity,
          context: appError.context,
        },
      });

      Analytics.capture(Analytics.EVENTS.ErrorOccurred, {
        error_type: appError.type,
        error_code: appError.code,
        error_message: appError.message,
        error_severity: appError.severity,
        error_context: appError.context,
      });

      // Call custom error handler if provided
      if (onError) {
        onError(appError);
      }
    },
    [onError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    error,
    handleError,
    clearError,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorContext);

  if (!context) {
    throw new Error("useErrorHandler must be used within an ErrorProvider");
  }

  return context;
}
