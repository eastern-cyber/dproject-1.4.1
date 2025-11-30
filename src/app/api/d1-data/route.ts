// src/app/api/d1-data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(request: NextRequest) {
  // Check if database URL is available
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    return NextResponse.json(
      { error: 'Database configuration error' },
      { status: 500 }
    );
  }

  try {
    // Create a database connection
    const sql = neon(process.env.DATABASE_URL);
    
    // Execute the query
    const result = await sql`
      SELECT 
        id,
        user_id,
        rate_thb_pol,
        append_pol,
        append_pol_tx_hash,
        append_pol_date_time,
        remark,
        created_at,
        updated_at
      FROM d1
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching D1 data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch D1 data' },
      { status: 500 }
    );
  }
}