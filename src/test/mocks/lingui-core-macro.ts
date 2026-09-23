type MessageDescriptor = { readonly message?: string; readonly id?: string; readonly context?: string };

/** A tagged template, or a descriptor (`t({ message, context })`), whose message is the source text. */
export const t = (strings: TemplateStringsArray | MessageDescriptor, ...values: unknown[]): string =>
  Array.isArray(strings)
    ? (strings as TemplateStringsArray).reduce((acc, str, i) => acc + str + (values[i] ?? ""), "")
    : ((strings as MessageDescriptor).message ?? (strings as MessageDescriptor).id ?? "");

export const msg = t;

export const defineMessage = <T>(value: T) => value;

/**
 * Source messages in this codebase are written in Romanian, so plural forms
 * resolve against Romanian CLDR rules — `one` for 1, `few` for 0 and 2–19,
 * `other` from 20 up — and `#` is the value, formatted for the locale. The
 * same rules the `Plural` component mock applies, so a hook and a component
 * rendering one count agree under test.
 */
const PLURAL_RULES = new Intl.PluralRules("ro");
const NUMBER_FORMAT = new Intl.NumberFormat("ro");

export const plural = (
  value: number,
  options: {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other?: string;
  }
) => {
  const exact = { 0: options.zero, 1: options.one, 2: options.two }[value];
  const byCategory = options[PLURAL_RULES.select(value)];
  const form =
    exact ?? byCategory ?? options.other ?? options.many ?? options.few ?? options.one ?? "";
  return form.split("#").join(NUMBER_FORMAT.format(value));
};

export const select = (value: string, options: Record<string, string>) =>
  options[value] ?? options.other ?? "";

export const selectOrdinal = (
  value: number,
  options: {
    one?: string;
    two?: string;
    few?: string;
    other?: string;
  }
) => {
  if (value === 1 && options.one !== undefined) {
    return options.one;
  }
  if (value === 2 && options.two !== undefined) {
    return options.two;
  }
  return options.other ?? options.few ?? "";
};
