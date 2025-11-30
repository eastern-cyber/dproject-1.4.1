import { config } from 'dotenv';
import { resolve } from 'path';

console.log('🔍 Debugging environment variables...');

// Try different paths
const pathsToTry = [
  '.env.local',
  '.env',
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env')
];

console.log('Looking for env files in:');
pathsToTry.forEach(path => {
  console.log(`  - ${path}`);
});

// Load environment variables
const result = config({ path: '.env.local' });
console.log('Dotenv result:', result);

// Check if DATABASE_URL is loaded
console.log('DATABASE_URL in process.env:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');

// Show all environment variables that start with DATABASE
console.log('\nEnvironment variables:');
Object.keys(process.env)
  .filter(key => key.includes('DATABASE') || key.includes('DB'))
  .forEach(key => {
    console.log(`  ${key}=${process.env[key]}`);
  });