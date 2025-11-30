// src/lib/db.ts
import postgres from 'postgres';

// Log the environment status for debugging
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL available:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Database functionality will be disabled');
}

const sql = process.env.DATABASE_URL 
  ? postgres(process.env.DATABASE_URL, {
      ssl: process.env.NODE_ENV === 'production' ? 'require' : 'allow',
      connect_timeout: 30,
    })
  : null;

export default sql;