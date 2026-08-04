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

/**
 * Source messages in this codebase are written in Romanian, so plural forms are
 * resolved against Romanian CLDR rules: `one` for 1, `few` for 0 and 2–19, and
 * `other` (which takes the "de" particle) from 20 up.
 *
 * Picking a form by `value === 1 / === 2` instead, as this mock used to, gives
 * every count above two the `other` branch — so "4 evenimente" rendered as
 * "4 de evenimente" and a real plural bug in a component looked identical to a
 * correct one under test.
 */
const PLURAL_RULES = new Intl.PluralRules("ro");
const NUMBER_FORMAT = new Intl.NumberFormat("ro");

/** `#` in an ICU plural is the value, formatted for the locale. */
const substituteHash = (form: ReactNode, value: number): ReactNode =>
  typeof form === "string"
    ? form.split("#").join(NUMBER_FORMAT.format(value))
    : form;

export const Plural = ({
  value,
  zero,
  one,
  two,
  few,
  many,
  other,
}: PluralProps) => {
  const exact = { 0: zero, 1: one, 2: two }[value];
  const byCategory = { zero, one, two, few, many, other }[
    PLURAL_RULES.select(value)
  ];
  const form = exact ?? byCategory ?? other ?? many ?? few ?? one ?? "";

  return <>{substituteHash(form, value)}</>;
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
