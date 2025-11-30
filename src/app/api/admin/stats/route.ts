// src/app/api/admin/stats/route.ts

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  if (!sql) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // Get total number of users
    const totalUsersResult = await sql`
      SELECT COUNT(*) as count FROM users
    `;
    const total = totalUsersResult[0]?.count || 0;

    // Get total POL from plan_a only (since plan_b doesn't exist)
    const polResult = await sql`
      SELECT 
        COALESCE(SUM((plan_a->>'POL')::numeric), 0) as total_pol
      FROM users
    `;
    const totalPOL = polResult[0]?.total_pol || 0;

    // Get average rate from plan_a only
    const rateResult = await sql`
      SELECT 
        AVG((plan_a->>'rateTHBPOL')::numeric) as avg_rate
      FROM users
      WHERE plan_a->>'rateTHBPOL' IS NOT NULL
    `;
    const avgRate = rateResult[0]?.avg_rate || 0;

    return NextResponse.json({
      total,
      totalPOL: parseFloat(totalPOL),
      avgRate: parseFloat(avgRate)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}