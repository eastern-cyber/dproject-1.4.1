// src/app/api/users/route.ts

import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET(request: Request) {
  const headers = {
    'Access-Control-Allow-Origin': 'https://users.dfi.fund',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  console.log('API /api/users called');
  
  if (!sql) {
    console.error('Database not configured');
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const getAll = searchParams.get('getAll');
    
    console.log('Query params:', { user_id, getAll });
    
    if (user_id) {
      // Get specific user by query parameter
      console.log('Fetching specific user:', user_id);
      const users = await sql`
        SELECT 
          id,
          user_id,
          referrer_id,
          email,
          name,
          token_id,
          plan_a,
          created_at,
          updated_at
        FROM users 
        WHERE user_id = ${user_id}
      `;
      
      console.log('User query result:', users);
      
      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(users[0]);
    } else if (getAll === 'true') {
      // Get all users for the check-user page (with additional fields)
      console.log('Fetching all users for check-user page');
      const users = await sql`
        SELECT 
          user_id,
          referrer_id,
          email,
          name,
          token_id,
          plan_a,
          created_at,
          updated_at
        FROM users 
        WHERE user_id IS NOT NULL 
        AND user_id != ''
        ORDER BY created_at DESC
      `;
      
      console.log(`Fetched ${users.length} users from database`);
      return NextResponse.json(users);
    } else {
      // Get all users for admin dashboard
      console.log('Fetching all users for admin dashboard');
      const users = await sql`
        SELECT 
          id,
          user_id,
          referrer_id,
          email,
          name,
          token_id,
          plan_a,
          created_at,
          updated_at
        FROM users 
        ORDER BY created_at DESC
      `;
      
      console.log(`Fetched ${users.length} users from database`);
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch users', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method for creating users if needed
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, referrer_id, email, name, token_id, plan_a } = body;

    if (!sql) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const result = await sql`
      INSERT INTO users (user_id, referrer_id, email, name, token_id, plan_a)
      VALUES (${user_id}, ${referrer_id}, ${email}, ${name}, ${token_id}, ${plan_a ? JSON.stringify(plan_a) : null})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Optional: Add PUT method for updating users if needed
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { user_id, plan_a } = body;

    if (!sql) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const result = await sql`
      UPDATE users 
      SET 
        plan_a = ${plan_a ? JSON.stringify(plan_a) : null},
        updated_at = NOW()
      WHERE user_id = ${user_id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}