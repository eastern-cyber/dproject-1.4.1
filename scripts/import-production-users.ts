//import-production-users.ts
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
  // Add other fields that might be in your JSON
}

class ProductionDataImporter {
  private sql: any;

  constructor(private databaseUrl: string) {
    this.sql = postgres(databaseUrl, { ssl: 'require', idle_timeout: 30 });
  }

  async fetchProductionData(): Promise<ProductionUser[]> {
    console.log('🌐 Fetching production data from GitHub...');
    
    const response = await fetch(
      'https://raw.githubusercontent.com/eastern-cyber/dproject-admin-1.0.2/main/public/dProjectUsers.json',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DFI-Admin-Importer/1.0.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch production data`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.length} users from production database`);
    return data;
  }

  async ensureTableStructure() {
    console.log('🛠️ Ensuring database table structure matches production...');
    
    await this.sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(42) NOT NULL UNIQUE,
        referrer_id VARCHAR(42) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        token_id VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create indexes for better performance
    await this.sql`CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_id)`;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_users_token_id ON users(token_id)`;
    
    console.log('✅ Database table structure verified');
  }

  async importUsers(users: ProductionUser[]) {
    console.log('📤 Importing users to production database...');
    
    let success = 0;
    let skipped = 0;
    let errors = 0;

    for (const [index, user] of users.entries()) {
      try {
        const [result] = await this.sql`
          INSERT INTO users (user_id, referrer_id, email, name, token_id, created_at)
          VALUES (
            ${user.user_id},
            ${user.referrer_id},
            ${user.email},
            ${user.name},
            ${user.token_id},
            ${user.created_at ? new Date(user.created_at) : this.sql`NOW()`}
          )
          ON CONFLICT (user_id) DO UPDATE SET
            referrer_id = EXCLUDED.referrer_id,
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            token_id = EXCLUDED.token_id,
            created_at = EXCLUDED.created_at
          RETURNING user_id, email, name
        `;

        if (result) {
          success++;
          if (success % 25 === 0) {
            console.log(`📦 Processed ${success}/${users.length} users...`);
          }
        }
      } catch (error: any) {
        if (error.code === '23505') {
          // Unique constraint violation (user_id or email already exists)
          skipped++;
        } else {
          errors++;
          console.error(`❌ Error importing user ${user.user_id}:`, error.message);
          
          // Log the problematic user data for debugging
          if (errors <= 5) { // Only show first 5 errors to avoid spam
            console.error('   Problematic user data:', JSON.stringify(user, null, 2));
          }
        }
      }
    }

    return { success, skipped, errors };
  }

  async validateImport() {
    console.log('🔍 Validating import results...');
    
    const totalUsers = await this.sql`SELECT COUNT(*) FROM users`;
    const uniqueUserIds = await this.sql`SELECT COUNT(DISTINCT user_id) FROM users`;
    const uniqueEmails = await this.sql`SELECT COUNT(DISTINCT email) FROM users`;
    
    console.log('📊 Database validation:');
    console.log(`   Total users: ${totalUsers[0].count}`);
    console.log(`   Unique user_ids: ${uniqueUserIds[0].count}`);
    console.log(`   Unique emails: ${uniqueEmails[0].count}`);
    
    if (totalUsers[0].count !== uniqueUserIds[0].count) {
      console.warn('⚠️  Warning: user_id values are not unique!');
    }
    
    if (totalUsers[0].count !== uniqueEmails[0].count) {
      console.warn('⚠️  Warning: email values are not unique!');
    }
  }

  async close() {
    await this.sql.end();
  }

  async runImport() {
    try {
      await this.ensureTableStructure();
      
      const users = await this.fetchProductionData();
      
      if (users.length === 0) {
        console.log('ℹ️ No users found in production data');
        return;
      }

      console.log(`📋 Sample user data:`, JSON.stringify(users[0], null, 2));
      
      const results = await this.importUsers(users);
      
      console.log('\n🎉 Import Complete!');
      console.log('===================');
      console.log(`✅ Successfully imported: ${results.success} users`);
      console.log(`⏭️ Skipped (duplicates): ${results.skipped} users`);
      console.log(`❌ Errors: ${results.errors} users`);
      console.log(`📊 Total processed: ${users.length} users`);
      
      await this.validateImport();
      
    } catch (error: any) {
      console.error('💥 Import failed:', error.message);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Main execution
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

const importer = new ProductionDataImporter(databaseUrl);
importer.runImport();