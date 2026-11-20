import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Database } from "@/types";
import { buildSeed } from "./seed";

/**
 * Low-level persistence: a single JSON document on local disk.
 *
 * - Atomic writes (temp file + rename), serialised through a promise queue.
 * - One process only. For multiple instances or serverless hosting, replace
 *   this module with another adapter implementing the same `DataStore` interface
 *   (see ARCHITECTURE.md → "Swapping the data backend").
 */
export interface DataStore {
  read(): Promise<Database>;
  update<T>(mutator: (db: Database) => T | Promise<T>): Promise<T>;
}

export const SCHEMA_VERSION = 1;

export function dataDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR || ".data");
}

class JsonFileStore implements DataStore {
  private cache: Database | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly file: string) {}

  private async load(): Promise<Database> {
    if (this.cache) return this.cache;
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const db = JSON.parse(raw) as Database;
      if (db.schemaVersion !== SCHEMA_VERSION) throw new Error(`Unsupported schema version ${db.schemaVersion}`);
      this.cache = db;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      const seeded = await buildSeed();
      await this.persist(seeded);
      this.cache = seeded;
    }
    return this.cache;
  }

  private async persist(db: Database) {
    await fs.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
    await fs.rename(tmp, this.file);
  }

  async read(): Promise<Database> {
    await this.queue;
    // Return a deep copy so callers can never mutate the cache outside update().
    return structuredClone(await this.load());
  }

  update<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const current = structuredClone(await this.load());
      const result = await mutator(current);
      await this.persist(current);
      this.cache = current;
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }
}

const g = globalThis as unknown as { __siaStore?: Map<string, DataStore> };

export function getStore(): DataStore {
  const file = path.join(dataDir(), "db.json");
  g.__siaStore ??= new Map();
  let store = g.__siaStore.get(file);
  if (!store) {
    store = new JsonFileStore(file);
    g.__siaStore.set(file, store);
  }
  return store;
}
