// src/app/api/d1/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const all = searchParams.get('all'); // New parameter to get all records

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (all === 'true') {
      // Get ALL records for the user, sorted by d1_sequence in descending order
      const result = await sql`
        SELECT * FROM d1 
        WHERE user_id = ${user_id} 
        ORDER BY d1_sequence DESC
      `;

      if (result.length === 0) {
        return NextResponse.json([], { status: 200 }); // Return empty array instead of error
      }

      return NextResponse.json(result);
    } else {
      // Get only the latest record (for backward compatibility)
      const result = await sql`
        SELECT * FROM d1 
        WHERE user_id = ${user_id} 
        ORDER BY d1_sequence DESC 
        LIMIT 1
      `;

      if (result.length === 0) {
        return NextResponse.json({ error: 'D1 record not found' }, { status: 404 });
      }

      return NextResponse.json(result[0]);
    }

  } catch (error) {
    console.error('Error fetching D1 data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userId = body.user_id;
    const now = new Date().toISOString();

    // Get the next sequence number for this user
    const sequenceResult = await sql`
      SELECT COALESCE(MAX(d1_sequence), 0) as max_sequence 
      FROM d1 
      WHERE user_id = ${userId}
    `;

    const nextSequence = (sequenceResult[0]?.max_sequence || 0) + 1;

    // Generate D1 ID if not provided
    let d1Id = body.d1_id;
    if (!d1Id) {
      // Extract first 6 characters of wallet address (after 0x)
      const addressPart = userId.startsWith('0x') ? userId.slice(2, 8).toUpperCase() : userId.slice(0, 6).toUpperCase();
      d1Id = `D1-${addressPart}-${String(nextSequence).padStart(3, '0')}`;
    }

    // Always insert a new record (multiple D1 memberships allowed)
    const result = await sql`
      INSERT INTO d1 (
        user_id, 
        rate_thb_pol, 
        append_pol, 
        used_bonus_pol,
        append_pol_tx_hash, 
        append_pol_date_time, 
        remark,
        d1_id,
        d1_sequence,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${body.rate_thb_pol || 0},
        ${body.append_pol || 0},
        ${body.used_bonus_pol || 0},
        ${body.append_pol_tx_hash || null},
        ${body.append_pol_date_time || null},
        ${body.remark ? JSON.stringify(body.remark) : null},
        ${d1Id},
        ${nextSequence},
        ${now},
        ${now}
      )
      RETURNING *
    `;

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