import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

export interface Database {
  close(): Promise<void>;
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>>;
  transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T>;
}

export async function runTransaction<T>(
  client: PoolClient,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function createDatabase(connectionString: string): Database {
  const pool = new Pool({ connectionString });

  return {
    close: () => pool.end(),
    query: <T extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[],
    ) => pool.query<T>(text, values),
    async transaction<T>(
      operation: (client: PoolClient) => Promise<T>,
    ): Promise<T> {
      const client = await pool.connect();
      return runTransaction(client, operation);
    },
  };
}
