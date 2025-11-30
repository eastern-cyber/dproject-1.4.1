//src/app/api/check-membership/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
    }

    if (!sql) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const user = await sql`
      SELECT user_id FROM users WHERE user_id = ${walletAddress}
    `;

    return NextResponse.json({ isMember: user.length > 0 });
  } catch (error) {
    console.error('Error checking membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}