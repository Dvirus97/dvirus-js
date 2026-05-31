export type ClassValue =
  | string
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>;

export function cx(...values: ClassValue[]): string {
  const classes: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (typeof value === 'string') {
      classes.push(value);
      continue;
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) {
        classes.push(key);
      }
    }
  }

  return classes.join(' ');
}
