export type AuthErrorCode =
  | "auth/invalid-credentials"
  | "auth/user-not-found"
  | "auth/email-already-in-use"
  | "auth/weak-password"
  | "auth/network-error"
  | "auth/too-many-requests"
  | "auth/requires-recent-login"
  | "auth/popup-closed"
  | "auth/invalid-email"
  | "auth/expired-action-code"
  | "auth/invalid-action-code"
  | "auth/missing-action-code"
  | "auth/user-disabled"
  | "auth/account-exists-with-different-credential";

export type ErrorSeverity = "fatal" | "error" | "warning";
export type ErrorSource = "auth" | "api" | "validation" | "runtime" | "network";

export interface AppErrorMetadata {
  type: ErrorSource;
  code: string;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  timestamp: number;
  context?: Record<string, unknown>;
}

export class AppError extends Error implements AppErrorMetadata {
  public type: ErrorSource;
  public code: string;
  public severity: ErrorSeverity;
  public isRecoverable: boolean;
  public timestamp: number;
  public context?: Record<string, unknown>;

  constructor(
    message: string,
    {
      type,
      code,
      severity = "error",
      isRecoverable = true,
      context = {},
    }: Omit<AppErrorMetadata, "timestamp">
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.code = code;
    this.severity = severity;
    this.isRecoverable = isRecoverable;
    this.timestamp = Date.now();
    this.context = context;
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
  }

  static fromError(error: Error, type: ErrorSource = "runtime"): AppError {
    return new AppError(error.message, {
      type,
      code: "unknown",
      severity: "error",
      isRecoverable: true,
      context: { originalError: error },
    });
  }
}

// Factory functions for common error types
export const createAuthError = (
  code: AuthErrorCode,
  message: string,
  context?: Record<string, unknown>
): AppError => {
  return new AppError(message, {
    type: "auth",
    code,
    severity: "error",
    isRecoverable: true,
    context,
  });
};

export const createApiError = (
  code: string,
  message: string,
  context?: Record<string, unknown>
): AppError => {
  return new AppError(message, {
    type: "api",
    code,
    severity: "error",
    isRecoverable: true,
    context,
  });
};

export const createValidationError = (
  code: string,
  message: string,
  context?: Record<string, unknown>
): AppError => {
  return new AppError(message, {
    type: "validation",
    code,
    severity: "warning",
    isRecoverable: true,
    context,
  });
};
