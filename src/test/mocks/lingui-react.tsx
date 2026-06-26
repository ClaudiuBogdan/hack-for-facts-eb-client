/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";

type TransProps = {
  children?: ReactNode;
  id?: string;
  message?: string;
  values?: Record<string, ReactNode> | ReactNode[];
};

const formatMessage = (
  message: string | undefined,
  values: Record<string, ReactNode> | ReactNode[] | undefined
) => {
  if (!message) {
    return "";
  }
  const normalized = Array.isArray(values)
    ? values.reduce<Record<string, ReactNode>>((acc, value, index) => {
        acc[String(index)] = value;
        return acc;
      }, {})
    : values;
  if (!normalized || Object.keys(normalized).length === 0) {
    return message;
  }
  let output = message;
  for (const [key, value] of Object.entries(normalized)) {
    output = output.split(`{${key}}`).join(String(value));
  }
  return output;
};

export const Trans = ({ children, id, message, values }: TransProps) => (
  <>{children ?? formatMessage(message, values) ?? id ?? ""}</>
);

export const I18nProvider = ({ children }: { children?: ReactNode }) => (
  <>{children}</>
);

export const useLingui = () => ({
  i18n: {
    locale: "en",
    _: (
      message: string | { id: string; message?: string },
      values?: Record<string, ReactNode> | ReactNode[]
    ) => {
      const messageString =
        typeof message === "string" ? message : message.message ?? message.id;
      return formatMessage(messageString, values);
    },
  },
});
