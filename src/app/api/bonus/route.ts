// src/app/api/bonus/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const client = await pool.connect();

    // If user_id is provided, return bonus data for that specific user
    if (userId) {
      try {
        const userBonusQuery = `
          SELECT * FROM bonus 
          WHERE user_id = $1 
          ORDER BY bonus_date DESC
        `;
        
        const result = await client.query(userBonusQuery, [userId]);
        client.release();

        return NextResponse.json(result.rows);
      } catch (error) {
        client.release();
        console.error('Error fetching user bonus data:', error);
        return NextResponse.json(
          { error: 'Failed to fetch user bonus data' },
          { status: 500 }
        );
      }
    }

    // Original admin dashboard functionality with pagination and search
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build WHERE clause for search
    let whereClause = '';
    // Replace line 50 and fix the type issues
    const queryParams: (string | number)[] = [limit, offset];
    let paramCount = 3;

    if (search) {
      whereClause = `
        WHERE (
          b.user_id ILIKE $${paramCount} OR 
          u.user_id ILIKE $${paramCount} OR 
          u.token_id ILIKE $${paramCount} OR 
          u.name ILIKE $${paramCount} OR 
          u.email ILIKE $${paramCount}
        )
      `;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    // Main query to get bonus data with user information
    // Join on user_id since both tables have this column for wallet address
    const query = `
      SELECT 
        b.*,
        u.token_id,
        u.name,
        u.email,
        u.referrer_id,
        u.created_at,
        u.updated_at
      FROM bonus b
      LEFT JOIN users u ON b.user_id = u.user_id
      ${whereClause}
      ORDER BY b.ar DESC
      LIMIT $1 OFFSET $2
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM bonus b
      LEFT JOIN users u ON b.user_id = u.user_id
      ${whereClause}
    `;

    // For count query, we only need the search parameter if it exists
    const countParams = search ? [queryParams[2]] : [];

    const [result, countResult] = await Promise.all([
      client.query(query, queryParams),
      client.query(countQuery, countParams)
    ]);

    client.release();

    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bonus data',
        message: error instanceof Error ? error.message : 'Unknown database error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}