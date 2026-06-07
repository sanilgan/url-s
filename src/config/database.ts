import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL
  || process.env.POSTGRES_URL
  || process.env.POSTGRES_PRISMA_URL;
const isHostedEnvironment = process.env.VERCEL === '1'
  || process.env.NODE_ENV === 'production';

function isLocalDatabaseUrl(value?: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1';
  } catch {
    return false;
  }
}

export const databaseConfigurationError = isHostedEnvironment
  && (!databaseUrl || isLocalDatabaseUrl(databaseUrl))
  ? 'A cloud PostgreSQL connection is required. Set DATABASE_URL (or POSTGRES_URL) in Vercel; localhost database addresses cannot be reached from Vercel.'
  : null;

const sslEnabled = process.env.DB_SSL === 'true'
  || (Boolean(databaseUrl) && process.env.DB_SSL !== 'false');

const realPool = new Pool({
  ...(databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5433', 10),
        database: process.env.DB_NAME || 'url_kisaltici',
        user: process.env.DB_USER || 'postgres',
        password: String(process.env.DB_PASSWORD || '')
      }),
  max: isHostedEnvironment ? 3 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: isHostedEnvironment,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false
});

const pool = new Proxy(realPool, {
  get(target, property, receiver) {
    if (databaseConfigurationError && (property === 'connect' || property === 'query')) {
      return async () => {
        throw new Error(databaseConfigurationError);
      };
    }

    const value = Reflect.get(target, property, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

realPool.on('error', (error) => {
  console.error('Database connection error:', error);
});

export default pool;
