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
    const users = await sql`
      SELECT 
        id,
        user_id,
        referrer_id,
        email,
        name,
        token_id,
        plan_a,
        date_time,
        pol,
        rate,
        created_at,
        updated_at
      FROM dproject_users 
      ORDER BY created_at DESC
    `;
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching dproject users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}