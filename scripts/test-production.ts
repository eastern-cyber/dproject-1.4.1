// scripts/test-production.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

const postgres = require('postgres');

async function testProduction() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('🧪 Testing production connection...');
    
    // Test connection
    const test = await sql`SELECT NOW() as time, version() as version`;
    console.log('✅ Database connected:', test[0].time);
    
    // Test users table
    const userCount = await sql`SELECT COUNT(*) FROM users`;
    console.log('👥 Total users:', userCount[0].count);
    
    // Test sample user
    const sampleUser = await sql`SELECT user_id, email FROM users LIMIT 1`;
    if (sampleUser.length > 0) {
      console.log('👤 Sample user:', sampleUser[0].user_id, '-', sampleUser[0].email);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await sql.end();
  }
}

testProduction();