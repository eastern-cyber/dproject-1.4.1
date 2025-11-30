// src/app/api/referrer/[referrerId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ referrerId: string }> }
) {
  try {
    // Extract referrerId from URL path
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const referrerId = pathParts[pathParts.length - 1];

    if (!sql) {
      return NextResponse.json(
        { error: 'Database connection not available' },
        { status: 500 }
      );
    }

    const referrer = await sql`
      SELECT user_id, email, name, token_id 
      FROM users 
      WHERE user_id = ${referrerId}
    `;

    if (referrer && referrer.length > 0) {
      return NextResponse.json(referrer[0]);
    } else {
      return NextResponse.json(
        { error: 'Referrer not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}