type MessageDescriptor = { id?: string; message?: string };

const normalizeValues = (
  values: Record<string, unknown> | unknown[] | undefined
) => {
  if (!values) {
    return undefined;
  }
  if (Array.isArray(values)) {
    return values.reduce<Record<string, unknown>>((acc, value, index) => {
      acc[String(index)] = value;
      return acc;
    }, {});
  }
  return values;
};

const formatMessage = (
  message: string,
  values: Record<string, unknown> | unknown[] | undefined
) => {
  const normalized = normalizeValues(values);
  if (!normalized || Object.keys(normalized).length === 0) {
    return message;
  }
  let output = message;
  for (const [key, value] of Object.entries(normalized)) {
    output = output.split(`{${key}}`).join(String(value));
  }
  return output;
};

export const i18n = {
  _: (
    message: string | MessageDescriptor,
    values?: Record<string, unknown> | unknown[]
  ) => {
    const messageString =
      typeof message === "string" ? message : message.message ?? message.id ?? "";
    return formatMessage(messageString, values);
  },
  locale: "en",
  locales: ["en"],
  activate: () => {},
  load: () => {},
  loadAndActivate: (_options: { locale: string; messages: Record<string, unknown> }) => {},
};
