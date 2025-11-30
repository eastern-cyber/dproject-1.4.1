//src/app/api/add-user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();

    if (!sql) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get the next token_id (max + 1)
    const maxTokenResult = await sql`SELECT COALESCE(MAX(token_id::integer), 0) as max_token FROM users`;
    const nextTokenId = (maxTokenResult[0]?.max_token || 0) + 1;

    // Insert new user with referrer_id and plan_a data
    const result = await sql`
      INSERT INTO users (
        user_id, 
        referrer_id, 
        token_id, 
        plan_a
      )
      VALUES (
        ${userData.user_id}, 
        ${userData.referrer_id}, 
        ${nextTokenId.toString()}, 
        ${sql.json(userData.plan_a)}
      )
      RETURNING token_id, user_id, referrer_id
    `;

    return NextResponse.json({ 
      success: true, 
      tokenId: result[0]?.token_id,
      userId: result[0]?.user_id,
      referrerId: result[0]?.referrer_id
    });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}