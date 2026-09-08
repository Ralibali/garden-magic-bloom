let flush: ((closeEditor?: boolean) => Promise<boolean>) | null = null;
export function registerFieldDraftFlusher(handler: (closeEditor?: boolean) => Promise<boolean>) {
  flush = handler;
  return () => { if (flush === handler) flush = null; };
}
export const flushFieldDraft = (closeEditor = false) => flush ? flush(closeEditor) : Promise.resolve(false);
