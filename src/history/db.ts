import { type MatchRecord, type MatchSummary, summarize } from './record';

/**
 * Storico delle partite in IndexedDB, il database integrato nel browser: i dati restano
 * sul dispositivo. Se IndexedDB non è disponibile le funzioni falliscono con un errore
 * che l'interfaccia mostra, senza bloccare il gioco.
 */
const DB_NAME = 'briscola-chiamata';
const STORE = 'matches';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB non disponibile in questo browser'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Impossibile aprire lo storico'));
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error('Errore dello storico'));
        tx.onabort = () => reject(tx.error ?? new Error('Operazione sullo storico annullata'));
      }),
  );
}

export const putMatch = (r: MatchRecord): Promise<unknown> => run('readwrite', (s) => s.put(r));

export const getMatch = (id: string): Promise<MatchRecord | undefined> =>
  run('readonly', (s) => s.get(id) as IDBRequest<MatchRecord | undefined>);

export const deleteMatch = (id: string): Promise<unknown> => run('readwrite', (s) => s.delete(id));

/** Riepiloghi di tutte le partite, dalla più recente. */
export async function listMatches(): Promise<MatchSummary[]> {
  const all = await run('readonly', (s) => s.getAll() as IDBRequest<MatchRecord[]>);
  return all.map(summarize).sort((a, b) => b.updatedAt - a.updatedAt);
}
