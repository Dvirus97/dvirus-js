type Primitive = string | number | boolean | null | undefined;

export type DataSource = Record<string, Primitive>;

export function toDataAttributes(source: DataSource): Record<string, string> {
  const output: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (value == null) {
      continue;
    }

    output[`data-${key}`] = String(value);
  }

  return output;
}
