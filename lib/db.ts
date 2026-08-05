import { Pool } from 'pg';
import { config } from './config';
import { logger } from './logger';

const pool = new Pool({
  connectionString: config.dbUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', { error: err.message });
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err: any) {
    logger.error('Query error', { text, error: err.message });
    throw err;
  }
}

export async function getClient() {
  return await pool.connect();
}

export async function closePool() {
  await pool.end();
}
