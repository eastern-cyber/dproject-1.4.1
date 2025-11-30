// src/app/api/a1-data/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    console.log('Fetching A1 data from database...');
    
    const result = await sql`
      SELECT 
        id,
        a1_id,
        user_id,
        rate_thb_pol,
        append_pol,
        append_pol_tx_hash,
        append_pol_date_time,
        remark,
        created_at,
        updated_at
      FROM a1 
      ORDER BY created_at DESC
    `;

    console.log(`Found ${result.length} A1 records`);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error fetching A1 data:', error);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Unknown database error';
    const errorDetails = {
      error: 'Failed to fetch A1 data',
      details: errorMessage,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(errorDetails, { status: 500 });
  }
}