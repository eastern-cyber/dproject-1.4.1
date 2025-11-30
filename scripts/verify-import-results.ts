import { config } from 'dotenv';
config({ path: '.env.local' });

const postgres = require('postgres');

async function verifyImportResults() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    console.log('🔍 Verifying import results...');
    
    // Get total count
    const totalCount = await sql`SELECT COUNT(*) FROM users`;
    console.log(`📊 Total users in database: ${totalCount[0].count}`);
    
    // Get counts by referrer_id to see distribution
    const referrerStats = await sql`
      SELECT referrer_id, COUNT(*) as count 
      FROM users 
      GROUP BY referrer_id 
      ORDER BY count DESC 
      LIMIT 10
    `;
    
    console.log('\n👥 Top referrers:');
    referrerStats.forEach((stat: any) => {
      console.log(`   ${stat.referrer_id}: ${stat.count} users`);
    });
    
    // Check for any null values in required fields
    const nullStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE user_id IS NULL) as null_user_ids,
        COUNT(*) FILTER (WHERE email IS NULL) as null_emails,
        COUNT(*) FILTER (WHERE name IS NULL) as null_names,
        COUNT(*) FILTER (WHERE token_id IS NULL) as null_token_ids,
        COUNT(*) FILTER (WHERE referrer_id IS NULL) as null_referrer_ids
      FROM users
    `;
    
    console.log('\n✅ Null value check:');
    console.log(`   Null user_ids: ${nullStats[0].null_user_ids}`);
    console.log(`   Null emails: ${nullStats[0].null_emails}`);
    console.log(`   Null names: ${nullStats[0].null_names}`);
    console.log(`   Null token_ids: ${nullStats[0].null_token_ids}`);
    console.log(`   Null referrer_ids: ${nullStats[0].null_referrer_ids}`);
    
    // Show sample of imported users
    const sampleUsers = await sql`
      SELECT user_id, email, name, token_id, referrer_id, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log('\n👤 Recent imported users:');
    sampleUsers.forEach((user: any, index: number) => {
      console.log(`${index + 1}. ${user.user_id} - ${user.email} - ${user.name}`);
      console.log(`   Token: ${user.token_id}, Referrer: ${user.referrer_id}`);
    });
    
    // Check database size
    const dbSize = await sql`
      SELECT pg_size_pretty(pg_total_relation_size('users')) as table_size
    `;
    
    console.log(`\n💾 Table size: ${dbSize[0].table_size}`);
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await sql.end();
  }
}

verifyImportResults();