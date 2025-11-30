//import-exact-production.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

const postgres = require('postgres');

interface ProductionUser {
  user_id: string;
  referrer_id: string;
  email: string;
  name: string;
  token_id: string;
  created_at?: string;
}

async function importExactProduction() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const sql = postgres(databaseUrl, { ssl: 'require', idle_timeout: 30 });

  try {
    console.log('🌐 Fetching production data from GitHub...');
    
    const response = await fetch(
      'https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.2/main/public/dProjectUsers.json'
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch production data`);
    }

    const users: ProductionUser[] = await response.json();
    console.log(`✅ Fetched ${users.length} users from production database`);
    
    if (users.length === 0) {
      console.log('ℹ️ No users found in production data');
      return;
    }

    // Show sample data structure
    console.log('\n📋 Sample user data:');
    console.log(JSON.stringify(users[0], null, 2));

    console.log('\n📤 Importing users...');
    
    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const [result] = await sql`
          INSERT INTO users (user_id, referrer_id, email, name, token_id, created_at)
          VALUES (
            ${user.user_id},
            ${user.referrer_id},
            ${user.email},
            ${user.name},
            ${user.token_id},
            ${user.created_at ? new Date(user.created_at) : sql`NOW()`}
          )
          ON CONFLICT (user_id) DO NOTHING
          RETURNING user_id
        `;

        if (result) {
          imported++;
          if (imported % 50 === 0) {
            console.log(`📦 Imported ${imported} users...`);
          }
        } else {
          duplicates++;
        }
      } catch (error: any) {
        errors++;
        console.error(`❌ Error importing user ${user.user_id}:`, error.message);
      }
    }

    console.log('\n🎉 Import Complete!');
    console.log('===================');
    console.log(`✅ Successfully imported: ${imported} users`);
    console.log(`⏭️ Skipped (duplicates): ${duplicates} users`);
    console.log(`❌ Errors: ${errors} users`);
    console.log(`📊 Total processed: ${users.length} users`);
    
    // Verify the import
    const finalCount = await sql`SELECT COUNT(*) FROM users`;
    console.log(`\n🔍 Final database count: ${finalCount[0].count} users`);
    
  } catch (error: any) {
    console.error('💥 Import failed:', error.message);
  } finally {
    await sql.end();
  }
}

// Run the import
importExactProduction();