/**
 * A tiny recorder for the HUD's "OpenGL calls" panel. Stage code calls `record` right after each
 * real `gl.*` call it issues, so the log narrates the actual draw process rather than a canned
 * description of it.
 */
export interface LogEntry {
  id: number;
  message: string;
}

export interface CallLog {
  entries: readonly LogEntry[];
  record(message: string): void;
  subscribe(listener: (entries: readonly LogEntry[]) => void): () => void;
  clear(): void;
}

export function createCallLog(): CallLog {
  let entries: LogEntry[] = [];
  let nextId = 0;
  const listeners = new Set<(entries: readonly LogEntry[]) => void>();

  function notify(): void {
    for (const listener of listeners) listener(entries);
  }

  return {
    get entries() {
      return entries;
    },
    record(message: string) {
      entries = [...entries, { id: nextId++, message }];
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear() {
      entries = [];
      notify();
    },
  };
}
