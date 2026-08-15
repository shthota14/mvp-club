import { Pool, PoolClient } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

export const query = <T = any>(
  text: string,
  params?: unknown[]
) => pool.query<T & Record<string, unknown>>(text, params);

export const getClient = (): Promise<PoolClient> => pool.connect();

export default pool;
