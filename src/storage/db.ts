import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Stack } from '../domain/types';

export const DB_NAME = 'ghoststack';
export const DB_VERSION = 1;
export const STACKS_STORE = 'stacks';

export interface GhostDbSchema extends DBSchema {
  stacks: {
    key: string;
    value: Stack;
  };
}

export type GhostDb = IDBPDatabase<GhostDbSchema>;

export function openGhostDb(): Promise<GhostDb> {
  return openDB<GhostDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STACKS_STORE)) {
        db.createObjectStore(STACKS_STORE, { keyPath: 'id' });
      }
    },
  });
}
