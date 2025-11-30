// src/app/api/bonus/d1/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if database connection is available
    if (!sql) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection not available',
          details: 'DATABASE_URL environment variable is not set'
        },
        { status: 500 }
      );
    }

    // Fetch bonus records from database
    const records = await sql`
      SELECT 
        id,
        user_id,
        pr,
        ar,
        bonus_date,
        calculated_at,
        created_at,
        updated_at
      FROM d1_bonus 
      ORDER BY created_at DESC
    `;
    
    // Convert numeric fields from string to number
    const processedRecords = records.map(record => ({
      ...record,
      pr: parseFloat(record.pr) || 0,
      ar: parseFloat(record.ar) || 0
    }));
    
    return NextResponse.json({
      success: true,
      records: processedRecords
    });
    
  } catch (error) {
    console.error('Error fetching bonus records:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bonus records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}