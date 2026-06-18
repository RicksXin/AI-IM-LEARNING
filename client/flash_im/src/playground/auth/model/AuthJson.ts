export function readAuthString(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new Error(`Auth field "${fieldName}" must be a string.`);
  }

  return value;
}

export function readAuthBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new Error(`Auth field "${fieldName}" must be a boolean.`);
  }

  return value;
}
