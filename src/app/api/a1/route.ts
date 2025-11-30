// src/app/api/a1/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove .toLowerCase() to preserve case
    const result = await sql`
      SELECT * FROM a1 WHERE user_id = ${user_id} LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'A1 record not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);

  } catch (error) {
    console.error('Error fetching A1 data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Remove .toLowerCase() to preserve original case
    const userId = body.user_id;
    const now = new Date().toISOString();

    // Check if record exists
    const existingRecord = await sql`
      SELECT id FROM a1 WHERE user_id = ${userId} LIMIT 1
    `;

    let result;
    
    if (existingRecord.length > 0) {
      // Update existing record
      result = await sql`
        UPDATE a1 SET
          a1_id = ${body.a1_id || null},
          rate_thb_pol = ${body.rate_thb_pol || 0},
          append_pol = ${body.append_pol || 0},
          append_pol_tx_hash = ${body.append_pol_tx_hash || null},
          append_pol_date_time = ${body.append_pol_date_time || null},
          remark = ${body.remark ? JSON.stringify(body.remark) : null},
          updated_at = ${now}
        WHERE user_id = ${userId}
        RETURNING *
      `;
    } else {
      // Insert new record
      result = await sql`
        INSERT INTO a1 (
          a1_id,
          user_id, 
          rate_thb_pol, 
          append_pol, 
          append_pol_tx_hash, 
          append_pol_date_time, 
          remark,
          created_at,
          updated_at
        ) VALUES (
          ${body.a1_id || null},
          ${userId},
          ${body.rate_thb_pol || 0},
          ${body.append_pol || 0},
          ${body.append_pol_tx_hash || null},
          ${body.append_pol_date_time || null},
          ${body.remark ? JSON.stringify(body.remark) : null},
          ${now},
          ${now}
        )
        RETURNING *
      `;
    }

    if (result && result.length > 0) {
      return NextResponse.json(result[0]);
    } else {
      throw new Error('No data returned from database operation');
    }

  } catch (error: any) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: `Database operation failed: ${error.message}` },
      { status: 500 }
    );
  }
}