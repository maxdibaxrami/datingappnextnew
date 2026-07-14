export function isAllowedOrigin(origin: string | null, allowedOrigins: readonly string[]): boolean {
  if (origin === null) {
    return true;
  }

  try {
    return allowedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}
