// scripts/init-db.ts
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Manual environment variable loading
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  
  if (existsSync(envPath)) {
    console.log('📁 Found .env.local file');
    const envContent = readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...value] = line.split('=');
        if (key && value.length > 0) {
          process.env[key.trim()] = value.join('=').trim().replace(/^"|"$/g, '');
        }
      }
    });
  } else {
    console.log('❌ No .env.local file found');
  }
}

// Load environment variables
loadEnv();

const postgres = require('postgres');

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  console.log('Looking for DATABASE_URL...');
  console.log('DATABASE_URL value:', databaseUrl || 'NOT FOUND');
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please create a .env.local file with:');
    console.error('DATABASE_URL="your-actual-connection-string"');
    console.error('');
    console.error('Get your connection string from: https://console.neon.tech/');
    process.exit(1);
  }

  console.log('🔗 Connecting to database...');
  
  const sql = postgres(databaseUrl, {
    ssl: 'require',
    idle_timeout: 20,
  });

  try {
    console.log('🚀 Initializing database...');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Users table created successfully');
    
    // Test with a simple query
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Database test successful. Current time:', result[0].time);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
    console.log('🔌 Connection closed');
  }
}

initDatabase();