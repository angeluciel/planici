/** Escapes `\`, `%` and `_` so the value matches literally under LIKE. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
