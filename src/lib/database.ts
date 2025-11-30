import postgres from 'postgres';

// For Vercel deployments, DATABASE_URL is automatically available
const databaseUrl = process.env.DATABASE_URL;

// Singleton database connection
let sql: ReturnType<typeof postgres> | null = null;

export function getDatabase() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!sql) {
    sql = postgres(databaseUrl, {
      ssl: 'require',
      idle_timeout: 20,
      max_lifetime: 60 * 10,
      transform: {
        undefined: null,
      },
    });
  }

  return sql;
}

export async function withDatabase<T>(callback: (sql: ReturnType<typeof postgres>) => Promise<T>): Promise<T> {
  const database = getDatabase();
  try {
    return await callback(database);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

export async function closeDatabase() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}