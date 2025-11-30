// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    let isHealthy = false;
    let databaseStatus = 'disconnected';
    
    if (sql) {
      try {
        // Test the database connection
        await sql`SELECT 1`;
        isHealthy = true;
        databaseStatus = 'connected';
      } catch (dbError) {
        console.error('Database connection test failed:', dbError);
        databaseStatus = 'error';
      }
    } else {
      databaseStatus = 'not-configured';
    }

    return NextResponse.json({ 
      status: isHealthy ? 'healthy' : 'unhealthy', 
      timestamp: new Date().toISOString(),
      database: databaseStatus,
      message: isHealthy ? 'Database connection successful' : 'Database connection failed or not configured'
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        timestamp: new Date().toISOString(),
        database: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}