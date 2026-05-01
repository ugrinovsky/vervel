/**
 * Extracts a readable message from an unknown catch value.
 * Use in catch blocks instead of `(err: any).message`.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
