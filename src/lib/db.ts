import { Pool } from "pg";

export interface Sql {
  <T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

const globalDb = globalThis as typeof globalThis & { __saraPool?: Pool };

export function getPool(): Pool {
  if (typeof window !== "undefined") throw new Error("Database access is server-only.");
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is required. Start PostgreSQL and run npm run db:migrate.");
  globalDb.__saraPool ??= new Pool({ connectionString, max: 10 });
  return globalDb.__saraPool;
}

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T>(strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as Sql;
  sql.query = <T>(text: string, params: unknown[] = []) => run<T>(text, params);
  return sql;
}

export async function getSql(): Promise<Sql> {
  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await getPool().query(text, params);
    return result.rows as T[];
  });
}

export async function withTransaction<T>(fn: (sql: Sql) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(toSql(async <R>(text: string, params: unknown[]) => {
      const result = await client.query(text, params);
      return result.rows as R[];
    }));
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
