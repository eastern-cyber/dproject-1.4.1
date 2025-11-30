// src/app/api/plan-b/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST(request: NextRequest) {
  try {
    const planBData = await request.json();

    // Validate required fields
    const requiredFields = ['user_id', 'pol', 'date_time', 'rate_thb_pol', 'cumulative_pol', 'append_pol', 'append_tx_hash'];
    for (const field of requiredFields) {
      if (!planBData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Insert into plan_b table
    const query = `
      INSERT INTO plan_b (
        user_id, pol, date_time, link_ipfs, rate_thb_pol, 
        cumulative_pol, append_pol, append_tx_hash,
        pr_pol, pr_pol_tx_hash, pr_pol_date_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      planBData.user_id,
      planBData.pol,
      planBData.date_time,
      planBData.link_ipfs || null,
      planBData.rate_thb_pol,
      planBData.cumulative_pol,
      planBData.append_pol,
      planBData.append_tx_hash,
      planBData.pr_pol || 0,
      planBData.pr_pol_tx_hash || null,
      planBData.pr_pol_date_time || null,
    ];

    const client = await pool.connect();
    try {
      const result = await client.query(query, values);
      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM plan_b WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1';
    const client = await pool.connect();
    
    try {
      const result = await client.query(query, [user_id]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Plan B data not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}