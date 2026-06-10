/**
 * Module-level store for per-document AI context.
 * Avoids re-creating the editor when changing context.
 */
let _context = '';

export function getAiContext(): string {
  return _context;
}

export function setAiContextStore(ctx: string) {
  _context = ctx;
}
