// scripts/check-table.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

const postgres = require('postgres');

async function checkTableStructure() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('🔍 Checking current table structure...');
    
    // Get table columns
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('📊 Current users table columns:');
    columns.forEach((col: any) => {
      console.log(`   ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Check if table has data
    const rowCount = await sql`SELECT COUNT(*) FROM users`;
    console.log(`📈 Current row count: ${rowCount[0].count}`);

  } catch (error: any) {
    console.error('❌ Error checking table:', error.message);
  } finally {
    await sql.end();
  }
}

checkTableStructure();