export function readAuthString(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new Error(`Auth field "${fieldName}" must be a string.`);
  }

  return value;
}
