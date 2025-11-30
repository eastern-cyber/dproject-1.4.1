import { config } from 'dotenv';
config({ path: '.env.local' });

const postgres = require('postgres');

async function recreateExactTable() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('🔄 Recreating table with exact production structure...');
    
    // Drop existing table (safe since row count is 0)
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    
    // Create table with EXACT production structure
    await sql`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(42) NOT NULL UNIQUE,
        referrer_id VARCHAR(42) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        token_id VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    console.log('✅ Table created with exact production structure');
    
    // Show the final structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('\n📊 Final table structure:');
    columns.forEach((col: any) => {
      console.log(`   ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error: any) {
    console.error('❌ Error recreating table:', error.message);
  } finally {
    await sql.end();
  }
}

recreateExactTable();