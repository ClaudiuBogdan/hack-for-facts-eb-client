/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";

type TransProps = {
  children?: ReactNode;
  id?: string;
  message?: string;
};

export const Trans = ({ children, id, message }: TransProps) => (
  <>{children ?? message ?? id ?? ""}</>
);

type PluralProps = {
  value: number;
  zero?: ReactNode;
  one?: ReactNode;
  two?: ReactNode;
  few?: ReactNode;
  many?: ReactNode;
  other?: ReactNode;
};

export const Plural = ({
  value,
  zero,
  one,
  two,
  few,
  many,
  other,
}: PluralProps) => {
  if (value === 0 && zero !== undefined) {
    return <>{zero}</>;
  }
  if (value === 1 && one !== undefined) {
    return <>{one}</>;
  }
  if (value === 2 && two !== undefined) {
    return <>{two}</>;
  }
  return <>{other ?? many ?? few ?? one ?? ""}</>;
};

type SelectProps = {
  value: string;
  options: Record<string, ReactNode>;
};

export const Select = ({ value, options }: SelectProps) => (
  <>{options[value] ?? options.other ?? ""}</>
);

type SelectOrdinalProps = {
  value: number;
  one?: ReactNode;
  two?: ReactNode;
  few?: ReactNode;
  other?: ReactNode;
};

export const SelectOrdinal = ({
  value,
  one,
  two,
  few,
  other,
}: SelectOrdinalProps) => {
  if (value === 1 && one !== undefined) {
    return <>{one}</>;
  }
  if (value === 2 && two !== undefined) {
    return <>{two}</>;
  }
  return <>{other ?? few ?? ""}</>;
};

export const useLingui = () => ({
  i18n: {
    locale: "en",
    _: (
      message: string | { id: string; message?: string },
      values?: Record<string, ReactNode> | ReactNode[]
    ) => {
      const messageString =
        typeof message === "string" ? message : message.message ?? message.id;
      if (!values || Object.keys(values).length === 0) {
        return messageString;
      }
      let output = messageString;
      const normalized = Array.isArray(values)
        ? values.reduce<Record<string, ReactNode>>((acc, value, index) => {
            acc[String(index)] = value;
            return acc;
          }, {})
        : values;
      for (const [key, value] of Object.entries(normalized)) {
        output = output.split(`{${key}}`).join(String(value));
      }
      return output;
    },
  },
});
